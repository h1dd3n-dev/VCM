(function (global) {
  "use strict";

  const STORAGE_KEY = "veloledger_data_v1";

  const CATEGORIES = {
    maintenance: { label: "Maintenance & Service", color: "#ea580c" },
    fuel: { label: "Fuel & Charging", color: "#2563eb" },
    parts: { label: "Parts & Tires", color: "#7c3aed" },
    insurance: { label: "Insurance & Reg", color: "#059669" },
    gear: { label: "Gear & Accessories", color: "#db2777" },
    other: { label: "Parking, Tolls & Other", color: "#64748b" }
  };

  function generateId(prefix) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return prefix + "_" + crypto.randomUUID().slice(0, 8);
    }
    return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function toIsoDate(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function todayIso() {
    return toIsoDate(new Date());
  }

  function offsetDateIso(daysDelta) {
    const dt = new Date();
    dt.setDate(dt.getDate() + daysDelta);
    return toIsoDate(dt);
  }

  function addMonthsIso(isoDate, months) {
    const parts = (isoDate || todayIso()).split("-").map(Number);
    const dt = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
    dt.setMonth(dt.getMonth() + months);
    return toIsoDate(dt);
  }

  function createEmptyState(keepSettings) {
    return {
      version: 1,
      isSampleData: false,
      bannerDismissed: true,
      settings: keepSettings || {
        currency: "$",
        distanceUnit: "km",
        theme: "light",
        fuelRate: null
      },
      bikes: [],
      expenses: [],
      services: []
    };
  }

  function createSampleState(keepSettings) {
    const bike1Id = "bike_mt07";
    const bike2Id = "bike_domane";

    return {
      version: 1,
      isSampleData: true,
      bannerDismissed: false,
      settings: keepSettings || {
        currency: "$",
        distanceUnit: "km",
        theme: "light",
        fuelRate: 1.46
      },
      bikes: [
        {
          id: bike1Id,
          name: "Yamaha MT-07",
          type: "Motorcycle",
          color: "#ea580c",
          purchasePrice: 7850,
          purchaseDate: offsetDateIso(-320),
          startOdometer: 1200,
          currentOdometer: 6420
        },
        {
          id: bike2Id,
          name: "Trek Domane SL5",
          type: "Road Bike",
          color: "#2563eb",
          purchasePrice: 2950,
          purchaseDate: offsetDateIso(-210),
          startOdometer: 0,
          currentOdometer: 2340
        }
      ],
      expenses: [
        {
          id: "exp_1",
          bikeId: bike1Id,
          date: offsetDateIso(-3),
          category: "fuel",
          title: "Premium Fuel Fill-Up",
          amount: 16.40,
          odometer: 6420,
          quantity: 11.23,
          fuelRate: 1.46,
          notes: "Shell V-Power 93"
        },
        {
          id: "exp_2",
          bikeId: bike2Id,
          date: offsetDateIso(-9),
          category: "parts",
          title: "Continental GP5000 Tire Pair",
          amount: 138.00,
          odometer: 2290,
          quantity: null,
          notes: "700x30c tubeless setup"
        },
        {
          id: "exp_3",
          bikeId: bike1Id,
          date: offsetDateIso(-18),
          category: "maintenance",
          title: "6,000 km Oil & Filter Service",
          amount: 145.00,
          odometer: 6010,
          quantity: null,
          notes: "Yamalube full synthetic + OEM filter"
        },
        {
          id: "exp_4",
          bikeId: bike1Id,
          date: offsetDateIso(-34),
          category: "fuel",
          title: "Highway Ride Refuel",
          amount: 15.10,
          odometer: 5840,
          quantity: 10.41,
          fuelRate: 1.45,
          notes: ""
        },
        {
          id: "exp_5",
          bikeId: bike2Id,
          date: offsetDateIso(-46),
          category: "maintenance",
          title: "Drivetrain Wax & Brake Bleed",
          amount: 72.50,
          odometer: 1850,
          quantity: null,
          notes: "Local Bike Hub"
        },
        {
          id: "exp_6",
          bikeId: bike1Id,
          date: offsetDateIso(-70),
          category: "insurance",
          title: "Semi-Annual Insurance Renewal",
          amount: 265.00,
          odometer: null,
          quantity: null,
          notes: "Comprehensive + theft coverage"
        },
        {
          id: "exp_7",
          bikeId: bike2Id,
          date: offsetDateIso(-95),
          category: "gear",
          title: "MIPS Helmet & Rear Radar Light",
          amount: 215.00,
          odometer: null,
          quantity: null,
          notes: "Safety visibility upgrade"
        },
        {
          id: "exp_8",
          bikeId: bike1Id,
          date: offsetDateIso(-128),
          category: "parts",
          title: "Rear Tire & Chain Sprocket Kit",
          amount: 310.00,
          odometer: 4100,
          quantity: null,
          notes: "Michelin Road 6 rear"
        },
        {
          id: "exp_9",
          bikeId: bike1Id,
          date: offsetDateIso(-155),
          category: "other",
          title: "City Garage Monthly Permit",
          amount: 45.00,
          odometer: null,
          quantity: null,
          notes: "Covered parking pass"
        }
      ],
      services: [
        {
          id: "srv_1",
          bikeId: bike1Id,
          type: "distance",
          title: "Chain Clean & Lube",
          intervalDist: 600,
          lastDist: 5750,
          dueDate: "",
          intervalMonths: 0,
          estCost: 15
        },
        {
          id: "srv_2",
          bikeId: bike1Id,
          type: "distance",
          title: "Engine Oil & Filter Change",
          intervalDist: 3000,
          lastDist: 6010,
          dueDate: "",
          intervalMonths: 0,
          estCost: 145
        },
        {
          id: "srv_3",
          bikeId: bike2Id,
          type: "distance",
          title: "Chain Hot-Wax Reapplication",
          intervalDist: 500,
          lastDist: 1850,
          dueDate: "",
          intervalMonths: 0,
          estCost: 20
        },
        {
          id: "srv_4",
          bikeId: bike1Id,
          type: "date",
          title: "Annual State Registration",
          intervalDist: 0,
          lastDist: 0,
          dueDate: offsetDateIso(10),
          intervalMonths: 12,
          estCost: 85
        }
      ]
    };
  }

  function sanitizeNumber(val, fallback) {
    const n = Number(val);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== "object") {
      return createSampleState();
    }
    const base = createEmptyState();
    base.isSampleData = Boolean(raw.isSampleData);
    base.bannerDismissed = Boolean(raw.bannerDismissed);

    if (raw.settings && typeof raw.settings === "object") {
      base.settings.currency = typeof raw.settings.currency === "string" && raw.settings.currency.trim()
        ? raw.settings.currency.trim().slice(0, 4)
        : "$";
      base.settings.distanceUnit = raw.settings.distanceUnit === "mi" ? "mi" : "km";
      base.settings.theme = raw.settings.theme === "dark" ? "dark" : "light";
      const fr = Number(raw.settings.fuelRate);
      base.settings.fuelRate = Number.isFinite(fr) && fr > 0 ? fr : null;
    }

    const bikeIds = new Set();
    if (Array.isArray(raw.bikes)) {
      base.bikes = raw.bikes
        .filter((b) => b && typeof b === "object" && typeof b.name === "string" && b.name.trim())
        .map((b) => {
          const id = typeof b.id === "string" && b.id ? b.id : generateId("bike");
          bikeIds.add(id);
          const startOdo = sanitizeNumber(b.startOdometer, 0);
          const curOdo = Math.max(startOdo, sanitizeNumber(b.currentOdometer, startOdo));
          return {
            id,
            name: b.name.trim().slice(0, 60),
            type: typeof b.type === "string" && b.type ? b.type : "Motorcycle",
            color: typeof b.color === "string" && /^#[0-9a-fA-F]{6}$/.test(b.color) ? b.color : "#ea580c",
            purchasePrice: sanitizeNumber(b.purchasePrice, 0),
            purchaseDate: typeof b.purchaseDate === "string" ? b.purchaseDate : "",
            startOdometer: startOdo,
            currentOdometer: curOdo
          };
        });
    }

    if (Array.isArray(raw.expenses)) {
      base.expenses = raw.expenses
        .filter((e) => e && typeof e === "object" && bikeIds.has(e.bikeId) && typeof e.title === "string" && e.title.trim())
        .map((e) => ({
          id: typeof e.id === "string" && e.id ? e.id : generateId("exp"),
          bikeId: e.bikeId,
          date: typeof e.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : todayIso(),
          category: CATEGORIES[e.category] ? e.category : "other",
          title: e.title.trim().slice(0, 100),
          amount: sanitizeNumber(e.amount, 0),
          odometer: e.odometer !== null && e.odometer !== "" && e.odometer !== undefined
            ? sanitizeNumber(e.odometer, 0)
            : null,
          quantity: e.quantity !== null && e.quantity !== "" && e.quantity !== undefined
            ? sanitizeNumber(e.quantity, 0)
            : null,
          fuelRate: e.fuelRate !== null && e.fuelRate !== "" && e.fuelRate !== undefined
            ? sanitizeNumber(e.fuelRate, 0)
            : null,
          notes: typeof e.notes === "string" ? e.notes.slice(0, 400) : ""
        }));
    }

    if (Array.isArray(raw.services)) {
      base.services = raw.services
        .filter((s) => s && typeof s === "object" && bikeIds.has(s.bikeId) && typeof s.title === "string" && s.title.trim())
        .map((s) => ({
          id: typeof s.id === "string" && s.id ? s.id : generateId("srv"),
          bikeId: s.bikeId,
          type: s.type === "date" ? "date" : "distance",
          title: s.title.trim().slice(0, 80),
          intervalDist: sanitizeNumber(s.intervalDist, 500),
          lastDist: sanitizeNumber(s.lastDist, 0),
          dueDate: typeof s.dueDate === "string" ? s.dueDate : "",
          intervalMonths: sanitizeNumber(s.intervalMonths, 0),
          estCost: s.estCost !== null && s.estCost !== "" && s.estCost !== undefined
            ? sanitizeNumber(s.estCost, 0)
            : null
        }));
    }

    return base;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const sample = createSampleState();
        saveState(sample);
        return sample;
      }
      return normalizeState(JSON.parse(raw));
    } catch (_err) {
      return createSampleState();
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_err) {
      // Ignore storage quota errors gracefully
    }
  }

  function formatCurrency(amount, symbol) {
    const num = Number(amount) || 0;
    const formatted = num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${symbol || "$"}${formatted}`;
  }

  function formatNumber(val) {
    return (Number(val) || 0).toLocaleString();
  }

  function formatDate(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "—";
    const parts = iso.split("-").map(Number);
    const dt = new Date(parts[0], parts[1] - 1, parts[2]);
    return dt.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  function filterExpensesByRange(expenses, rangeKey) {
    if (!rangeKey || rangeKey === "all") return expenses.slice();
    const now = new Date();
    let cutoffIso = "0000-01-01";

    if (rangeKey === "this-month") {
      cutoffIso = toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
    } else if (rangeKey === "last-3m") {
      cutoffIso = toIsoDate(new Date(now.getFullYear(), now.getMonth() - 2, 1));
    } else if (rangeKey === "last-6m") {
      cutoffIso = toIsoDate(new Date(now.getFullYear(), now.getMonth() - 5, 1));
    } else if (rangeKey === "this-year") {
      cutoffIso = toIsoDate(new Date(now.getFullYear(), 0, 1));
    }

    return expenses.filter((e) => e.date >= cutoffIso);
  }

  function getScopedBikes(state, bikeId) {
    if (!bikeId || bikeId === "all") return state.bikes;
    return state.bikes.filter((b) => b.id === bikeId);
  }

  function computeMetrics(state, selectedBikeId, rangeKey) {
    const scopedBikes = getScopedBikes(state, selectedBikeId);
    const scopedBikeIds = new Set(scopedBikes.map((b) => b.id));

    const allBikeExpenses = state.expenses.filter((e) => scopedBikeIds.has(e.bikeId));
    const rangedExpenses = filterExpensesByRange(allBikeExpenses, rangeKey);

    const runningCost = rangedExpenses.reduce((sum, e) => sum + e.amount, 0);
    const allTimeRunning = allBikeExpenses.reduce((sum, e) => sum + e.amount, 0);
    const purchaseCost = scopedBikes.reduce((sum, b) => sum + (b.purchasePrice || 0), 0);
    const tco = purchaseCost + allTimeRunning;

    const trackedDistance = scopedBikes.reduce(
      (sum, b) => sum + Math.max(0, (b.currentOdometer || 0) - (b.startOdometer || 0)),
      0
    );
    const costPerDist = trackedDistance > 0 ? allTimeRunning / trackedDistance : null;

    // Active months in filtered expenses
    const monthBuckets = new Set(rangedExpenses.map((e) => e.date.slice(0, 7)));
    const activeMonths = monthBuckets.size;
    const monthlyAverage = activeMonths > 0 ? runningCost / activeMonths : 0;

    // Category breakdown
    const catTotals = {};
    Object.keys(CATEGORIES).forEach((k) => {
      catTotals[k] = 0;
    });
    rangedExpenses.forEach((e) => {
      const key = CATEGORIES[e.category] ? e.category : "other";
      catTotals[key] += e.amount;
    });

    const categoryBreakdown = Object.keys(CATEGORIES)
      .map((key) => ({
        category: key,
        label: CATEGORIES[key].label,
        color: CATEGORIES[key].color,
        total: catTotals[key],
        pct: runningCost > 0 ? (catTotals[key] / runningCost) * 100 : 0
      }))
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total);

    // Last 6 months series (always relative to current month for clear trendline)
    const now = new Date();
    const monthlySeries = [];
    const monthSumMap = {};
    allBikeExpenses.forEach((e) => {
      const mk = e.date.slice(0, 7);
      monthSumMap[mk] = (monthSumMap[mk] || 0) + e.amount;
    });

    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString(undefined, { month: "short" });
      monthlySeries.push({
        monthKey: mk,
        label,
        total: monthSumMap[mk] || 0
      });
    }

    return {
      runningCost,
      entryCount: rangedExpenses.length,
      allTimeRunning,
      purchaseCost,
      tco,
      trackedDistance,
      costPerDist,
      activeMonths,
      monthlyAverage,
      categoryBreakdown,
      monthlySeries
    };
  }

  function evaluateServiceStatus(service, bike, distUnit) {
    const unit = distUnit || "km";
    if (!bike) {
      return { status: "ok", summary: "No bike", sortWeight: 2 };
    }

    if (service.type === "distance") {
      const interval = Math.max(1, service.intervalDist || 500);
      const nextAt = (service.lastDist || 0) + interval;
      const remaining = nextAt - (bike.currentOdometer || 0);
      const soonThreshold = Math.max(100, Math.round(interval * 0.15));

      if (remaining <= 0) {
        return {
          status: "overdue",
          statusLabel: "Overdue",
          summary: `Overdue by ${formatNumber(Math.abs(remaining))} ${unit} (target ${formatNumber(nextAt)} ${unit})`,
          sortWeight: 0
        };
      }
      if (remaining <= soonThreshold) {
        return {
          status: "soon",
          statusLabel: "Due Soon",
          summary: `Due in ${formatNumber(remaining)} ${unit} (at ${formatNumber(nextAt)} ${unit})`,
          sortWeight: 1
        };
      }
      return {
        status: "ok",
        statusLabel: "OK",
        summary: `${formatNumber(remaining)} ${unit} remaining (at ${formatNumber(nextAt)} ${unit})`,
        sortWeight: 2
      };
    }

    // Date-based reminder
    if (!service.dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(service.dueDate)) {
      return { status: "ok", statusLabel: "Scheduled", summary: "No date set", sortWeight: 2 };
    }

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const parts = service.dueDate.split("-").map(Number);
    const dueMidnight = new Date(parts[0], parts[1] - 1, parts[2]);
    const diffDays = Math.round((dueMidnight - todayMidnight) / 86400000);

    if (diffDays < 0) {
      return {
        status: "overdue",
        statusLabel: "Overdue",
        summary: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} (${formatDate(service.dueDate)})`,
        sortWeight: 0
      };
    }
    if (diffDays <= 14) {
      return {
        status: "soon",
        statusLabel: "Due Soon",
        summary: diffDays === 0 ? `Due today (${formatDate(service.dueDate)})` : `Due in ${diffDays} day${diffDays === 1 ? "" : "s"} (${formatDate(service.dueDate)})`,
        sortWeight: 1
      };
    }
    return {
      status: "ok",
      statusLabel: "OK",
      summary: `Due ${formatDate(service.dueDate)} (${diffDays} days)`,
      sortWeight: 2
    };
  }

  function escapeCsvCell(value) {
    const str = value === null || value === undefined ? "" : String(value);
    const safe = /^[=+\-@]/.test(str) ? "'" + str : str;
    return `"${safe.replace(/"/g, '""')}"`;
  }

  function calcFuelQuantity(amount, rate) {
    const a = Number(amount);
    const r = Number(rate);
    if (!Number.isFinite(a) || !Number.isFinite(r) || a <= 0 || r <= 0) return null;
    return Math.round((a / r) * 100) / 100;
  }

  function exportExpensesToCsv(expenses, bikesById, settings) {
    const headers = [
      "Date",
      "Bike",
      "Category",
      "Description",
      `Amount (${settings.currency})`,
      `Odometer (${settings.distanceUnit})`,
      "Fuel/Energy Qty",
      `Fuel Rate (${settings.currency}/unit)`,
      "Notes"
    ];

    const rows = expenses.map((e) => {
      const bike = bikesById[e.bikeId];
      const cat = CATEGORIES[e.category] ? CATEGORIES[e.category].label : e.category;
      return [
        escapeCsvCell(e.date),
        escapeCsvCell(bike ? bike.name : "Unknown"),
        escapeCsvCell(cat),
        escapeCsvCell(e.title),
        escapeCsvCell(e.amount.toFixed(2)),
        escapeCsvCell(e.odometer !== null ? e.odometer : ""),
        escapeCsvCell(e.quantity !== null ? e.quantity : ""),
        escapeCsvCell(e.fuelRate !== null && e.fuelRate !== undefined ? e.fuelRate : ""),
        escapeCsvCell(e.notes || "")
      ].join(",");
    });

    return [headers.map(escapeCsvCell).join(","), ...rows].join("\r\n");
  }

  global.VeloStore = {
    CATEGORIES,
    generateId,
    todayIso,
    addMonthsIso,
    createEmptyState,
    createSampleState,
    normalizeState,
    loadState,
    saveState,
    formatCurrency,
    formatNumber,
    formatDate,
    calcFuelQuantity,
    computeMetrics,
    evaluateServiceStatus,
    exportExpensesToCsv
  };
})(window);
