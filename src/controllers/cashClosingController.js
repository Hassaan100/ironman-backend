import mongoose from 'mongoose';
import { CashClosing } from '../models/CashClosing.js';
import { Payment } from '../models/Payment.js';
import { Expense } from '../models/Expense.js';

/**
 * Helper to parse YYYY-MM-DD into start and end of day Date boundaries
 */
const getDateBoundaries = (dateStr) => {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const dayStart = new Date(year, month, day, 0, 0, 0, 0);
  const dayEnd = new Date(year, month, day, 23, 59, 59, 999);

  return { dayStart, dayEnd };
};

/**
 * GET /api/cash-closing?date=YYYY-MM-DD
 * Retrieves cash income, cash expenses, expected cash and existing closing record for a single day.
 */
export const getCashClosing = async (req, res) => {
  try {
    const gymId = req.gymId;
    const gymObjectId = mongoose.Types.ObjectId.isValid(gymId)
      ? new mongoose.Types.ObjectId(gymId)
      : gymId;

    const todayStr = new Date().toISOString().split('T')[0];
    const targetDateStr = req.query.date || todayStr;

    // Reject future dates
    if (targetDateStr > todayStr) {
      return res.status(400).json({
        success: false,
        message: `Future dates (${targetDateStr}) cannot be selected for cash closing. Max selectable date is today (${todayStr}).`,
      });
    }

    const { dayStart, dayEnd } = getDateBoundaries(targetDateStr);

    // 1. Check if a closing record already exists for this date and gym
    const existingClosing = await CashClosing.findOne({ gymId, dateStr: targetDateStr });

    // 2. Aggregate Cash Income (Payments with method === 'cash')
    const [cashIncomeAgg, nonCashIncomeAgg, cashExpensesAgg] = await Promise.all([
      Payment.aggregate([
        {
          $match: {
            gymId: gymObjectId,
            method: 'cash',
            paidOn: { $gte: dayStart, $lte: dayEnd },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),

      Payment.aggregate([
        {
          $match: {
            gymId: gymObjectId,
            method: { $ne: 'cash' },
            paidOn: { $gte: dayStart, $lte: dayEnd },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),

      Expense.aggregate([
        {
          $match: {
            gymId: gymObjectId,
            spentOn: { $gte: dayStart, $lte: dayEnd },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    // 3. Fetch detailed line-item transactions for the drawer breakdown
    const [cashPaymentsList, cashExpensesList] = await Promise.all([
      Payment.find({
        gymId,
        method: 'cash',
        paidOn: { $gte: dayStart, $lte: dayEnd },
      })
        .sort({ paidOn: -1 })
        .select('memberId memberName amount method paymentType invoiceNo receivedBy paidOn notes'),

      Expense.find({
        gymId,
        spentOn: { $gte: dayStart, $lte: dayEnd },
      })
        .sort({ spentOn: -1 })
        .select('title category amount spentOn receiptNo paidBy notes'),
    ]);

    const cashIncome = cashIncomeAgg[0]?.total || 0;
    const nonCashIncome = nonCashIncomeAgg[0]?.total || 0;
    const cashExpenses = cashExpensesAgg[0]?.total || 0;

    // 4. Resolve Opening Cash (from most recent prior CashClosing record)
    let openingCash = 0;
    if (existingClosing) {
      openingCash = existingClosing.openingCash || 0;
    } else {
      const lastClosing = await CashClosing.findOne({
        gymId,
        dateStr: { $lt: targetDateStr },
      }).sort({ dateStr: -1 });

      if (lastClosing) {
        openingCash = lastClosing.countedCash || 0;
      }
    }

    const calculatedExpectedCash = openingCash + cashIncome - cashExpenses;

    res.json({
      success: true,
      data: {
        dateStr: targetDateStr,
        isToday: targetDateStr === todayStr,
        isClosed: Boolean(existingClosing),
        closingRecord: existingClosing || null,
        financials: {
          openingCash: existingClosing ? existingClosing.openingCash : openingCash,
          cashIncome: existingClosing ? existingClosing.cashIncome : cashIncome,
          cashExpenses: existingClosing ? existingClosing.cashExpenses : cashExpenses,
          expectedCash: existingClosing ? existingClosing.expectedCash : calculatedExpectedCash,
          nonCashIncome,
          cashTransactionsCount: cashPaymentsList.length,
          cashExpensesCount: cashExpensesList.length,
        },
        transactions: {
          cashPayments: cashPaymentsList,
          cashExpenses: cashExpensesList,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/cash-closing
 * Closes the drawer and locks the cash closing for a specific business day.
 */
export const closeCashDay = async (req, res) => {
  try {
    const gymId = req.gymId;
    const gymObjectId = mongoose.Types.ObjectId.isValid(gymId)
      ? new mongoose.Types.ObjectId(gymId)
      : gymId;

    const userRole = req.user?.role || 'owner';
    if (!['owner', 'receptionist', 'superadmin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only Gym Owners and Receptionists are permitted to close daily cash.',
      });
    }

    const dateInput = req.body.date || req.body.dateStr;
    const { countedCash, notes, openingCashOverride } = req.body;

    const todayStr = new Date().toISOString().split('T')[0];
    const targetDateStr = dateInput || todayStr;

    // 1. Validate date
    if (!targetDateStr) {
      return res.status(400).json({ success: false, message: 'Date is required for cash closing' });
    }

    if (targetDateStr > todayStr) {
      return res.status(400).json({
        success: false,
        message: 'Cannot close cash for future dates. Max allowed date is today.',
      });
    }

    // 2. Validate countedCash
    if (countedCash === undefined || countedCash === null || isNaN(Number(countedCash)) || Number(countedCash) < 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid non-negative counted cash amount is required.',
      });
    }

    const numericCountedCash = Number(countedCash);

    // 3. Verify that the date is not already closed
    const alreadyClosed = await CashClosing.findOne({ gymId, dateStr: targetDateStr });
    if (alreadyClosed) {
      return res.status(400).json({
        success: false,
        message: `Cash for date ${targetDateStr} has already been closed on ${new Date(alreadyClosed.closedAt).toLocaleString()} by ${alreadyClosed.closedBy?.name || 'Staff'}. Already closed dates cannot be overwritten.`,
        closingRecord: alreadyClosed,
      });
    }

    const { dayStart, dayEnd } = getDateBoundaries(targetDateStr);

    // 4. Authoritative backend recalculation of cash flow
    const [cashIncomeAgg, cashExpensesAgg] = await Promise.all([
      Payment.aggregate([
        {
          $match: {
            gymId: gymObjectId,
            method: 'cash',
            paidOn: { $gte: dayStart, $lte: dayEnd },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),

      Expense.aggregate([
        {
          $match: {
            gymId: gymObjectId,
            spentOn: { $gte: dayStart, $lte: dayEnd },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const cashIncome = cashIncomeAgg[0]?.total || 0;
    const cashExpenses = cashExpensesAgg[0]?.total || 0;

    // 5. Resolve authoritative opening cash
    let openingCash = 0;
    if (openingCashOverride !== undefined && openingCashOverride !== null && !isNaN(Number(openingCashOverride))) {
      openingCash = Math.max(0, Number(openingCashOverride));
    } else {
      const lastClosing = await CashClosing.findOne({
        gymId,
        dateStr: { $lt: targetDateStr },
      }).sort({ dateStr: -1 });

      if (lastClosing) {
        openingCash = lastClosing.countedCash || 0;
      }
    }

    // 6. Calculate expected cash, difference and status
    const expectedCash = openingCash + cashIncome - cashExpenses;
    const difference = numericCountedCash - expectedCash;

    let status = 'balanced';
    if (difference < 0) {
      status = 'short';
    } else if (difference > 0) {
      status = 'excess';
    }

    // 7. Create and persist CashClosing record
    const closingRecord = await CashClosing.create({
      gymId,
      dateStr: targetDateStr,
      openingCash,
      cashIncome,
      cashExpenses,
      expectedCash,
      countedCash: numericCountedCash,
      difference,
      status,
      notes: notes ? notes.trim() : '',
      closedBy: {
        userId: req.user?.userId || undefined,
        name: req.user?.name || 'Staff',
        email: req.user?.email || '',
        role: req.user?.role || 'owner',
      },
      closedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: `Cash for ${targetDateStr} successfully closed and reconciled. Drawer is ${status.toUpperCase()} by ${Math.abs(difference)} PKR.`,
      closingRecord,
      data: closingRecord,
    });
  } catch (error) {
    // Handle duplicate key race condition
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Cash for this date has already been closed by another session.',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};
