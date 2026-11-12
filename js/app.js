(function () {
  "use strict";

  let state = VeloStore.loadState();
  let selectedBikeId = "all";
  let activeView = "dashboard";
  let autoFilledFuelTitle = false;
  let deferredInstallPrompt = null;

  // DOM helpers
  const $ = (id) => document.getElementById(id);

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function showToast(message) {
    const container = $("toastContainer");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  function persistAndRender() {
    VeloStore.saveState(state);
    renderAll();
  }

  function getBikesById() {
    const map = {};
    state.bikes.forEach((b) => {
      map[b.id] = b;
    });
    return map;
  }

  // Theme & Unit tokens
  function applyThemeAndTokens() {
    const isDark = state.settings.theme === "dark";
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    $("themeIconSun").classList.toggle("hidden", !isDark);
    $("themeIconMoon").classList.toggle("hidden", isDark);

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute("content", isDark ? "#131c31" : "#ea580c");
    }

    document.querySelectorAll(".currency-symbol").forEach((el) => {
      el.textContent = state.settings.currency;
    });
    document.querySelectorAll(".unit-dist").forEach((el) => {
      el.textContent = state.settings.distanceUnit;
    });
    const distOpt = $("srvTypeDistanceOpt");
    if (distOpt) {
      distOpt.textContent = `Distance Interval (${state.settings.distanceUnit})`;
    }
  }

  // Navigation
  function switchView(viewName) {
    activeView = viewName;
    document.querySelectorAll(".nav-tab").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.view === viewName);
    });
    document.querySelectorAll(".view").forEach((sec) => {
      sec.classList.toggle("is-active", sec.id === `view-${viewName}`);
    });
    renderAll();
  }

  // Modal controls
  function openModal(modalId) {
    const modal = $(modalId);
    if (!modal) return;
    modal.classList.remove("hidden");
    const firstInput = modal.querySelector("input:not([type='hidden']), select, textarea");
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 20);
    }
  }

  function closeModal(modalId) {
    const modal = $(modalId);
    if (modal) {
      modal.classList.add("hidden");
    }
  }

  function closeAllModals() {
    document.querySelectorAll(".modal-backdrop").forEach((m) => m.classList.add("hidden"));
  }

  // Populate static and dynamic selects
  function populateBikeDropdowns() {
    if (selectedBikeId !== "all" && !state.bikes.some((b) => b.id === selectedBikeId)) {
      selectedBikeId = "all";
    }

    const globalSelect = $("globalBikeSelect");
    const optionsHtml = [
      `<option value="all">All Bikes (${state.bikes.length})</option>`,
      ...state.bikes.map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name)}</option>`)
    ].join("");
    globalSelect.innerHTML = optionsHtml;
    globalSelect.value = selectedBikeId;

    const bikeOnlyOptions = state.bikes.length
      ? state.bikes.map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name)}</option>`).join("")
      : `<option value="">No bikes added</option>`;

    $("expBikeId").innerHTML = bikeOnlyOptions;
    $("srvBikeId").innerHTML = bikeOnlyOptions;
  }

  function populateCategoryDropdowns() {
    const entries = Object.entries(VeloStore.CATEGORIES);
    $("expCategory").innerHTML = entries
      .map(([key, meta]) => `<option value="${escapeHtml(key)}">${escapeHtml(meta.label)}</option>`)
      .join("");

    const currentFilter = $("expenseCategoryFilter").value || "all";
    $("expenseCategoryFilter").innerHTML = [
      `<option value="all">All Categories</option>`,
      ...entries.map(([key, meta]) => `<option value="${escapeHtml(key)}">${escapeHtml(meta.label)}</option>`)
    ].join("");
    $("expenseCategoryFilter").value = currentFilter;
  }

  function populateMonthFilter() {
    const prev = $("expenseMonthFilter").value || "all";
    const months = Array.from(new Set(state.expenses.map((e) => e.date.slice(0, 7)))).sort().reverse();
    const options = months.map((mk) => {
      const [y, m] = mk.split("-").map(Number);
      const label = new Date(y, m - 1, 1).toLocaleDateString(undefined, { year: "numeric", month: "short" });
      return `<option value="${escapeHtml(mk)}">${escapeHtml(label)}</option>`;
    });
    $("expenseMonthFilter").innerHTML = [`<option value="all">All Months</option>`, ...options].join("");
    $("expenseMonthFilter").value = months.includes(prev) ? prev : "all";
  }

  // Banner
  function renderBanner() {
    const show = state.isSampleData && !state.bannerDismissed;
    $("sampleBanner").classList.toggle("hidden", !show);
  }

  // Dashboard View
  function renderDashboard() {
    const cur = state.settings.currency;
    const unit = state.settings.distanceUnit;
    const rangeKey = $("dashboardRange").value || "all";
    const bikesById = getBikesById();
    const metrics = VeloStore.computeMetrics(state, selectedBikeId, rangeKey);

    if (selectedBikeId === "all") {
      $("dashSubtitle").textContent = `${state.bikes.length} bike${state.bikes.length === 1 ? "" : "s"} in your garage`;
    } else {
      const b = bikesById[selectedBikeId];
      $("dashSubtitle").textContent = b
        ? `${b.name} · ${b.type} · Odometer ${VeloStore.formatNumber(b.currentOdometer)} ${unit}`
        : "";
    }

    $("kpiRunning").textContent = VeloStore.formatCurrency(metrics.runningCost, cur);
    $("kpiRunningMeta").textContent = `${metrics.entryCount} logged expense${metrics.entryCount === 1 ? "" : "s"}`;

    $("kpiTco").textContent = VeloStore.formatCurrency(metrics.tco, cur);
    $("kpiTcoMeta").textContent = `Purchase ${VeloStore.formatCurrency(metrics.purchaseCost, cur)} + Running ${VeloStore.formatCurrency(metrics.allTimeRunning, cur)}`;

    $("kpiCostPerDist").textContent = metrics.costPerDist !== null
      ? VeloStore.formatCurrency(metrics.costPerDist, cur)
      : "—";
    $("kpiDistMeta").textContent = metrics.trackedDistance > 0
      ? `All-time over ${VeloStore.formatNumber(metrics.trackedDistance)} ${unit}`
      : `Update odometer to calculate`;

    $("kpiMonthlyAvg").textContent = VeloStore.formatCurrency(metrics.monthlyAverage, cur);
    $("kpiMonthlyMeta").textContent = metrics.activeMonths > 0
      ? `Across ${metrics.activeMonths} active month${metrics.activeMonths === 1 ? "" : "s"}`
      : "No active months in range";

    VeloCharts.renderCategoryDonut($("categoryChartContainer"), metrics.categoryBreakdown, metrics.runningCost, cur);
    VeloCharts.renderMonthlyBarChart($("monthlyChartContainer"), metrics.monthlySeries, cur);

    renderRecentExpenses(bikesById, cur, unit);
    renderDashboardServiceAlerts(bikesById, unit);
  }

  function renderRecentExpenses(bikesById, cur, unit) {
    const container = $("recentExpensesList");
    const scoped = state.expenses
      .filter((e) => selectedBikeId === "all" || e.bikeId === selectedBikeId)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
      .slice(0, 5);

    if (scoped.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>${state.bikes.length === 0 ? "Add your first bike to start logging costs." : "No expenses logged yet."}</p>
          <button type="button" class="btn btn-sm btn-primary" id="dashEmptyActionBtn">${state.bikes.length === 0 ? "+ Add Bike" : "+ Log Cost"}</button>
        </div>`;
      const actionBtn = $("dashEmptyActionBtn");
      if (actionBtn) {
        actionBtn.addEventListener("click", () => {
          if (state.bikes.length === 0) openBikeModal();
          else openExpenseModal();
        });
      }
      return;
    }

    container.innerHTML = scoped.map((e) => {
      const bike = bikesById[e.bikeId];
      const cat = VeloStore.CATEGORIES[e.category] || VeloStore.CATEGORIES.other;
      const odoText = e.odometer !== null ? ` · ${VeloStore.formatNumber(e.odometer)} ${unit}` : "";
      const fuelText = e.category === "fuel" && e.quantity > 0
        ? ` · ${e.quantity.toFixed(2)} L${e.fuelRate ? ` @ ${cur}${e.fuelRate}` : ""}`
        : "";
      return `
        <div class="recent-item">
          <div class="recent-main">
            <div class="recent-title">${escapeHtml(e.title)}</div>
            <div class="recent-meta">
              <span class="badge" style="background:${cat.color}18;color:${cat.color}">${escapeHtml(cat.label)}</span>
              <span>${escapeHtml(bike ? bike.name : "Unknown")}</span>
              <span>· ${escapeHtml(VeloStore.formatDate(e.date))}${escapeHtml(odoText)}${escapeHtml(fuelText)}</span>
            </div>
          </div>
          <div class="recent-amount mono">${escapeHtml(VeloStore.formatCurrency(e.amount, cur))}</div>
        </div>`;
    }).join("");
  }

  function renderDashboardServiceAlerts(bikesById, unit) {
    const container = $("serviceAlertsList");
    const scoped = state.services
      .filter((s) => selectedBikeId === "all" || s.bikeId === selectedBikeId)
      .map((s) => {
        const bike = bikesById[s.bikeId];
        return {
          service: s,
          bike,
          eval: VeloStore.evaluateServiceStatus(s, bike, unit)
        };
      })
      .sort((a, b) => a.eval.sortWeight - b.eval.sortWeight)
      .slice(0, 5);

    if (scoped.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No service reminders configured.</p>
          <button type="button" class="btn btn-sm btn-secondary" id="dashAddSrvBtn">+ Add Reminder</button>
        </div>`;
      const btn = $("dashAddSrvBtn");
      if (btn) {
        btn.addEventListener("click", () => openServiceModal());
      }
      return;
    }

    container.innerHTML = scoped.map(({ service, bike, eval: ev }) => {
      const statusClass = ev.status === "overdue" ? "status-overdue" : ev.status === "soon" ? "status-soon" : "status-ok";
      return `
        <div class="recent-item">
          <div class="recent-main">
            <div class="recent-title">${escapeHtml(service.title)}</div>
            <div class="recent-meta">
              <span>${escapeHtml(bike ? bike.name : "Unknown")}</span>
              <span>· ${escapeHtml(ev.summary)}</span>
            </div>
          </div>
          <span class="status-pill ${statusClass}">${escapeHtml(ev.statusLabel)}</span>
        </div>`;
    }).join("");
  }

  // Expenses View
  function getFilteredExpenses() {
    const bikesById = getBikesById();
    const q = ($("expenseSearch").value || "").trim().toLowerCase();
    const cat = $("expenseCategoryFilter").value || "all";
    const month = $("expenseMonthFilter").value || "all";
    const sort = $("expenseSort").value || "date-desc";

    const list = state.expenses.filter((e) => {
      if (selectedBikeId !== "all" && e.bikeId !== selectedBikeId) return false;
      if (cat !== "all" && e.category !== cat) return false;
      if (month !== "all" && !e.date.startsWith(month)) return false;
      if (q) {
        const bikeName = bikesById[e.bikeId] ? bikesById[e.bikeId].name.toLowerCase() : "";
        const haystack = `${e.title} ${e.notes} ${bikeName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (sort === "date-asc") return a.date.localeCompare(b.date);
      if (sort === "amount-desc") return b.amount - a.amount;
      if (sort === "amount-asc") return a.amount - b.amount;
      return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
    });

    return list;
  }

  function renderExpensesView() {
    const cur = state.settings.currency;
    const unit = state.settings.distanceUnit;
    const bikesById = getBikesById();
    const filtered = getFilteredExpenses();
    const total = filtered.reduce((sum, e) => sum + e.amount, 0);

    $("filteredCountText").textContent = `${filtered.length} expense${filtered.length === 1 ? "" : "s"}`;
    $("filteredTotalAmount").textContent = VeloStore.formatCurrency(total, cur);

    const tbody = $("expensesTableBody");
    const emptyEl = $("expensesEmptyState");

    if (filtered.length === 0) {
      tbody.innerHTML = "";
      emptyEl.classList.remove("hidden");
      if (state.bikes.length === 0) {
        emptyEl.innerHTML = `<p>You don't have any bikes in your garage yet.</p><button type="button" class="btn btn-primary" id="expEmptyAddBike">+ Add Your First Bike</button>`;
        $("expEmptyAddBike").addEventListener("click", () => openBikeModal());
      } else if (state.expenses.length === 0) {
        emptyEl.innerHTML = `<p>No expenses logged yet. Add your first fuel, maintenance, or gear cost.</p><button type="button" class="btn btn-primary" id="expEmptyAddExp">+ Log Cost</button>`;
        $("expEmptyAddExp").addEventListener("click", () => openExpenseModal());
      } else {
        emptyEl.innerHTML = `<p>No expenses match your current filters.</p><button type="button" class="btn btn-secondary" id="expClearFiltersBtn">Clear Filters</button>`;
        $("expClearFiltersBtn").addEventListener("click", () => {
          $("expenseSearch").value = "";
          $("expenseCategoryFilter").value = "all";
          $("expenseMonthFilter").value = "all";
          renderExpensesView();
        });
      }
      return;
    }

    emptyEl.classList.add("hidden");
    tbody.innerHTML = filtered.map((e) => {
      const bike = bikesById[e.bikeId];
      const cat = VeloStore.CATEGORIES[e.category] || VeloStore.CATEGORIES.other;
      const qtyLabel = e.quantity && e.quantity > 0
        ? (e.category === "fuel"
            ? `${Number(e.quantity).toFixed(2)} L${e.fuelRate ? ` @ ${cur}${e.fuelRate}` : ""}`
            : `${e.quantity} qty`)
        : "";
      const qtyTag = qtyLabel
        ? `<span class="badge" style="background:var(--surface-muted);border:1px solid var(--border);margin-left:6px;">${escapeHtml(qtyLabel)}</span>`
        : "";
      return `
        <tr>
          <td class="mono">${escapeHtml(VeloStore.formatDate(e.date))}</td>
          <td>
            <span class="badge">
              <span class="badge-dot" style="background:${bike ? bike.color : "#64748b"}"></span>
              <span>${escapeHtml(bike ? bike.name : "Unknown")}</span>
            </span>
          </td>
          <td>
            <span class="badge" style="background:${cat.color}18;color:${cat.color}">${escapeHtml(cat.label)}</span>
          </td>
          <td>
            <div class="expense-desc-title">${escapeHtml(e.title)}${qtyTag}</div>
            ${e.notes ? `<div class="expense-desc-notes">${escapeHtml(e.notes)}</div>` : ""}
          </td>
          <td class="num-col mono">${e.odometer !== null ? `${escapeHtml(VeloStore.formatNumber(e.odometer))} ${unit}` : "—"}</td>
          <td class="num-col mono"><strong>${escapeHtml(VeloStore.formatCurrency(e.amount, cur))}</strong></td>
          <td class="actions-col">
            <div class="row-actions">
              <button type="button" class="btn btn-sm btn-ghost" data-action="edit-expense" data-id="${escapeHtml(e.id)}" aria-label="Edit expense">Edit</button>
              <button type="button" class="btn btn-sm btn-ghost" data-action="delete-expense" data-id="${escapeHtml(e.id)}" aria-label="Delete expense" style="color:var(--danger)">Del</button>
            </div>
          </td>
        </tr>`;
    }).join("");
  }

  // Garage & Service View
  function renderGarageView() {
    const cur = state.settings.currency;
    const unit = state.settings.distanceUnit;
    const bikesById = getBikesById();
    const bikesGrid = $("bikesGrid");

    if (state.bikes.length === 0) {
      bikesGrid.innerHTML = `
        <div class="card empty-state" style="grid-column:1 / -1">
          <p>Your garage is empty. Add a motorcycle, road bike, MTB, or e-bike to begin tracking costs.</p>
          <button type="button" class="btn btn-primary" id="garageEmptyAddBike">+ Add Bike</button>
        </div>`;
      $("garageEmptyAddBike").addEventListener("click", () => openBikeModal());
    } else {
      bikesGrid.innerHTML = state.bikes.map((b) => {
        const m = VeloStore.computeMetrics(state, b.id, "all");
        const costDistText = m.costPerDist !== null
          ? `${VeloStore.formatCurrency(m.costPerDist, cur)}/${unit}`
          : "—";
        return `
          <article class="card bike-card">
            <div class="bike-card-stripe" style="background:${b.color}"></div>
            <div class="bike-card-top">
              <div>
                <h4 class="bike-name">${escapeHtml(b.name)}</h4>
                <div class="bike-type">${escapeHtml(b.type)}${b.purchaseDate ? ` · Bought ${escapeHtml(VeloStore.formatDate(b.purchaseDate))}` : ""}</div>
              </div>
              <span class="badge" style="background:${b.color}18;color:${b.color}">${escapeHtml(VeloStore.formatNumber(b.currentOdometer))} ${unit}</span>
            </div>

            <div class="bike-stats">
              <div>
                <div class="bike-stat-label">Running Costs</div>
                <div class="bike-stat-value mono">${escapeHtml(VeloStore.formatCurrency(m.allTimeRunning, cur))}</div>
              </div>
              <div>
                <div class="bike-stat-label">Total Ownership</div>
                <div class="bike-stat-value mono">${escapeHtml(VeloStore.formatCurrency(m.tco, cur))}</div>
              </div>
              <div>
                <div class="bike-stat-label">Tracked Distance</div>
                <div class="bike-stat-value mono">${escapeHtml(VeloStore.formatNumber(m.trackedDistance))} ${unit}</div>
              </div>
              <div>
                <div class="bike-stat-label">Running Cost / ${unit}</div>
                <div class="bike-stat-value mono">${escapeHtml(costDistText)}</div>
              </div>
            </div>

            <div class="bike-card-actions">
              <button type="button" class="btn btn-sm btn-secondary" data-action="log-for-bike" data-id="${escapeHtml(b.id)}">+ Log Cost</button>
              <button type="button" class="btn btn-sm btn-ghost" data-action="edit-bike" data-id="${escapeHtml(b.id)}">Edit</button>
              <button type="button" class="btn btn-sm btn-ghost" data-action="delete-bike" data-id="${escapeHtml(b.id)}" style="color:var(--danger)">Delete</button>
            </div>
          </article>`;
      }).join("");
    }

    // Service list
    const srvContainer = $("garageServicesList");
    const scopedServices = state.services
      .filter((s) => selectedBikeId === "all" || s.bikeId === selectedBikeId)
      .map((s) => {
        const bike = bikesById[s.bikeId];
        return {
          service: s,
          bike,
          eval: VeloStore.evaluateServiceStatus(s, bike, unit)
        };
      })
      .sort((a, b) => a.eval.sortWeight - b.eval.sortWeight);

    if (scopedServices.length === 0) {
      srvContainer.innerHTML = `
        <div class="empty-state">
          <p>${state.bikes.length === 0 ? "Add a bike first to set up service intervals." : "No maintenance or renewal reminders yet."}</p>
        </div>`;
      return;
    }

    srvContainer.innerHTML = scopedServices.map(({ service, bike, eval: ev }) => {
      const statusClass = ev.status === "overdue" ? "status-overdue" : ev.status === "soon" ? "status-soon" : "status-ok";
      const estText = service.estCost ? ` · Est. ${VeloStore.formatCurrency(service.estCost, cur)}` : "";
      return `
        <div class="service-row">
          <div class="service-row-main">
            <div class="service-row-title">
              <span class="status-pill ${statusClass}">${escapeHtml(ev.statusLabel)}</span>
              <span>${escapeHtml(service.title)}</span>
              <span class="badge">
                <span class="badge-dot" style="background:${bike ? bike.color : "#64748b"}"></span>
                <span>${escapeHtml(bike ? bike.name : "Unknown")}</span>
              </span>
            </div>
            <div class="service-row-meta">${escapeHtml(ev.summary)}${escapeHtml(estText)}</div>
          </div>
          <div class="service-row-actions">
            <button type="button" class="btn btn-sm btn-secondary" data-action="complete-service" data-id="${escapeHtml(service.id)}">Mark Done</button>
            <button type="button" class="btn btn-sm btn-ghost" data-action="edit-service" data-id="${escapeHtml(service.id)}">Edit</button>
            <button type="button" class="btn btn-sm btn-ghost" data-action="delete-service" data-id="${escapeHtml(service.id)}" style="color:var(--danger)">Del</button>
          </div>
        </div>`;
    }).join("");
  }

  function renderAll() {
    applyThemeAndTokens();
    populateBikeDropdowns();
    populateMonthFilter();
    renderBanner();

    if (activeView === "dashboard") renderDashboard();
    if (activeView === "expenses") renderExpensesView();
    if (activeView === "garage") renderGarageView();
  }

  // Modal Openers & Fuel Auto-Calc
  function updateFuelCalcHint(amount, rate, qty) {
    const hint = $("fuelCalcHint");
    if (!hint) return;
    const cur = state.settings.currency;
    if (amount > 0 && rate > 0 && qty !== null) {
      hint.textContent = `Auto: ${cur}${amount.toFixed(2)} ÷ ${cur}${rate}/unit = ${qty.toFixed(2)} L/kWh`;
      hint.classList.add("is-active");
    } else if (rate > 0) {
      hint.textContent = `Rate set (${cur}${rate}/unit) — enter Total Cost to auto-calculate quantity.`;
      hint.classList.remove("is-active");
    } else {
      hint.textContent = "Set fuel rate & total cost to auto-calculate quantity.";
      hint.classList.remove("is-active");
    }
  }

  function recalculateFuelQty() {
    if ($("expCategory").value !== "fuel") return;
    const amount = Number($("expAmount").value);
    const rate = Number($("expFuelRate").value);
    const qty = VeloStore.calcFuelQuantity(amount, rate);

    if (qty !== null) {
      $("expQuantity").value = qty.toFixed(2);
    } else if (rate > 0 && (!Number.isFinite(amount) || amount <= 0)) {
      $("expQuantity").value = "";
    }
    updateFuelCalcHint(amount, rate, qty);
  }

  function toggleFuelFieldVisibility() {
    const cat = $("expCategory").value;
    const hasQty = Boolean($("expQuantity").value);
    const isFuel = cat === "fuel";
    $("expFuelField").classList.toggle("hidden", !isFuel && !hasQty);

    if (isFuel) {
      if (!$("expFuelRate").value && state.settings.fuelRate) {
        $("expFuelRate").value = state.settings.fuelRate;
      }
      if (!$("expId").value && !$("expTitle").value.trim()) {
        $("expTitle").value = "Fuel Fill-Up";
        autoFilledFuelTitle = true;
      }
      recalculateFuelQty();
    } else if (autoFilledFuelTitle && $("expTitle").value === "Fuel Fill-Up") {
      $("expTitle").value = "";
      autoFilledFuelTitle = false;
    }
  }

  function openExpenseModal(expenseToEdit, presetBikeId) {
    if (state.bikes.length === 0) {
      showToast("Add a bike to your garage first.");
      openBikeModal();
      return;
    }

    const form = $("expenseForm");
    form.reset();
    autoFilledFuelTitle = false;

    if (expenseToEdit) {
      $("expenseModalTitle").textContent = "Edit Bike Cost";
      $("expId").value = expenseToEdit.id;
      $("expBikeId").value = expenseToEdit.bikeId;
      $("expDate").value = expenseToEdit.date;
      $("expCategory").value = expenseToEdit.category;
      $("expAmount").value = expenseToEdit.amount;
      $("expTitle").value = expenseToEdit.title;
      $("expOdometer").value = expenseToEdit.odometer !== null ? expenseToEdit.odometer : "";
      $("expFuelRate").value = expenseToEdit.fuelRate !== null && expenseToEdit.fuelRate !== undefined
        ? expenseToEdit.fuelRate
        : (expenseToEdit.category === "fuel" && state.settings.fuelRate ? state.settings.fuelRate : "");
      $("expQuantity").value = expenseToEdit.quantity !== null ? expenseToEdit.quantity : "";
      $("expNotes").value = expenseToEdit.notes || "";
      updateFuelCalcHint(
        Number(expenseToEdit.amount) || 0,
        Number($("expFuelRate").value) || 0,
        expenseToEdit.quantity
      );
    } else {
      $("expenseModalTitle").textContent = "Log Bike Cost";
      $("expId").value = "";
      const targetBikeId = presetBikeId || (selectedBikeId !== "all" ? selectedBikeId : state.bikes[0].id);
      $("expBikeId").value = targetBikeId;
      $("expDate").value = VeloStore.todayIso();
      $("expCategory").value = "maintenance";
      $("expFuelRate").value = state.settings.fuelRate || "";
      const bike = state.bikes.find((b) => b.id === targetBikeId);
      $("expOdometer").placeholder = bike ? `Current: ${bike.currentOdometer}` : "Optional";
    }

    toggleFuelFieldVisibility();
    openModal("expenseModal");
  }

  function openBikeModal(bikeToEdit) {
    const form = $("bikeForm");
    form.reset();

    if (bikeToEdit) {
      $("bikeModalTitle").textContent = "Edit Bike";
      $("bikeId").value = bikeToEdit.id;
      $("bikeName").value = bikeToEdit.name;
      $("bikeType").value = bikeToEdit.type;
      $("bikeColor").value = bikeToEdit.color;
      $("bikePurchasePrice").value = bikeToEdit.purchasePrice || "";
      $("bikePurchaseDate").value = bikeToEdit.purchaseDate || "";
      $("bikeStartOdometer").value = bikeToEdit.startOdometer;
      $("bikeCurrentOdometer").value = bikeToEdit.currentOdometer;
    } else {
      $("bikeModalTitle").textContent = "Add Bike to Garage";
      $("bikeId").value = "";
      $("bikePurchaseDate").value = VeloStore.todayIso();
      $("bikeStartOdometer").value = "0";
      $("bikeCurrentOdometer").value = "0";
    }

    openModal("bikeModal");
  }

  function toggleServiceTypeGroups() {
    const type = $("srvType").value;
    const isDate = type === "date";
    document.querySelectorAll(".srv-dist-group").forEach((el) => el.classList.toggle("hidden", isDate));
    document.querySelectorAll(".srv-date-group").forEach((el) => el.classList.toggle("hidden", !isDate));
  }

  function openServiceModal(serviceToEdit) {
    if (state.bikes.length === 0) {
      showToast("Add a bike first before creating service reminders.");
      openBikeModal();
      return;
    }

    const form = $("serviceForm");
    form.reset();

    if (serviceToEdit) {
      $("serviceModalTitle").textContent = "Edit Service Reminder";
      $("srvId").value = serviceToEdit.id;
      $("srvBikeId").value = serviceToEdit.bikeId;
      $("srvType").value = serviceToEdit.type;
      $("srvTitle").value = serviceToEdit.title;
      $("srvIntervalDist").value = serviceToEdit.intervalDist || "";
      $("srvLastDist").value = serviceToEdit.lastDist || 0;
      $("srvDueDate").value = serviceToEdit.dueDate || VeloStore.todayIso();
      $("srvIntervalMonths").value = serviceToEdit.intervalMonths || 0;
      $("srvEstCost").value = serviceToEdit.estCost !== null ? serviceToEdit.estCost : "";
    } else {
      $("serviceModalTitle").textContent = "Add Service Reminder";
      $("srvId").value = "";
      const targetBikeId = selectedBikeId !== "all" ? selectedBikeId : state.bikes[0].id;
      const bike = state.bikes.find((b) => b.id === targetBikeId);
      $("srvBikeId").value = targetBikeId;
      $("srvType").value = "distance";
      $("srvIntervalDist").value = "1000";
      $("srvLastDist").value = bike ? bike.currentOdometer : 0;
      $("srvDueDate").value = VeloStore.addMonthsIso(VeloStore.todayIso(), 6);
      $("srvIntervalMonths").value = "12";
    }

    toggleServiceTypeGroups();
    openModal("serviceModal");
  }

  function updatePwaInstallUi() {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const topBtn = $("installAppBtn");
    const settingsBtn = $("settingsInstallBtn");
    const statusEl = $("pwaInstallStatus");

    if (isStandalone) {
      if (topBtn) topBtn.classList.add("hidden");
      if (settingsBtn) settingsBtn.classList.add("hidden");
      if (statusEl) statusEl.textContent = "Running in installed app mode (offline ready).";
      return;
    }

    if (deferredInstallPrompt) {
      if (topBtn) topBtn.classList.remove("hidden");
      if (settingsBtn) settingsBtn.classList.remove("hidden");
      if (statusEl) statusEl.textContent = "Ready to install VeloLedger on this device for offline access.";
      return;
    }

    if (topBtn) topBtn.classList.add("hidden");
    if (settingsBtn) settingsBtn.classList.add("hidden");
    if (statusEl) {
      statusEl.textContent = isIos
        ? "On iPhone/iPad Safari, tap the Share button and choose \"Add to Home Screen\"."
        : "Use your browser menu (Install app / Add to Home Screen) to install offline.";
    }
  }

  async function triggerPwaInstall() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice && choice.outcome === "accepted") {
      showToast("Installing VeloLedger...");
    }
    deferredInstallPrompt = null;
    updatePwaInstallUi();
  }

  function openSettingsModal() {
    $("prefCurrency").value = state.settings.currency;
    $("prefUnit").value = state.settings.distanceUnit;
    $("prefFuelRate").value = state.settings.fuelRate || "";
    updatePwaInstallUi();
    openModal("settingsModal");
  }

  // Event Listeners
  function bindEvents() {
    // Tabs
    document.querySelectorAll(".nav-tab").forEach((btn) => {
      btn.addEventListener("click", () => switchView(btn.dataset.view));
    });
    document.querySelectorAll("[data-goto-view]").forEach((btn) => {
      btn.addEventListener("click", () => switchView(btn.dataset.gotoView));
    });

    // Global Bike Select
    $("globalBikeSelect").addEventListener("change", (e) => {
      selectedBikeId = e.target.value;
      renderAll();
    });

    // Dashboard time range
    $("dashboardRange").addEventListener("change", () => renderDashboard());

    // Theme toggle
    $("themeToggleBtn").addEventListener("click", () => {
      state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
      persistAndRender();
    });

    // Sample banner actions
    $("dismissBannerBtn").addEventListener("click", () => {
      state.bannerDismissed = true;
      persistAndRender();
    });
    $("clearSampleBtn").addEventListener("click", () => {
      if (!confirm("Remove the sample bikes and expenses so you can start with a clean ledger?")) return;
      state = VeloStore.createEmptyState(state.settings);
      selectedBikeId = "all";
      persistAndRender();
      showToast("Started fresh! Add your first bike.");
    });

    // Topbar CTA & inline buttons
    $("addExpenseBtn").addEventListener("click", () => openExpenseModal());
    $("addExpenseBtnInline").addEventListener("click", () => openExpenseModal());
    $("addBikeBtn").addEventListener("click", () => openBikeModal());
    $("addServiceBtn").addEventListener("click", () => openServiceModal());
    $("openSettingsBtn").addEventListener("click", () => openSettingsModal());

    // Expense filters
    $("expenseSearch").addEventListener("input", () => renderExpensesView());
    $("expenseCategoryFilter").addEventListener("change", () => renderExpensesView());
    $("expenseMonthFilter").addEventListener("change", () => renderExpensesView());
    $("expenseSort").addEventListener("change", () => renderExpensesView());

    // CSV Export
    $("exportCsvBtn").addEventListener("click", () => {
      const filtered = getFilteredExpenses();
      if (filtered.length === 0) {
        showToast("No expenses to export.");
        return;
      }
      const csv = VeloStore.exportExpensesToCsv(filtered, getBikesById(), state.settings);
      downloadFile(`bike-expenses-${VeloStore.todayIso()}.csv`, csv, "text/csv;charset=utf-8");
      showToast(`Exported ${filtered.length} expense(s) to CSV.`);
    });

    // Modal closing
    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
      btn.addEventListener("click", () => closeModal(btn.dataset.closeModal));
    });
    document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) {
          backdrop.classList.add("hidden");
        }
      });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAllModals();
    });

    // Form field dependencies
    $("expCategory").addEventListener("change", toggleFuelFieldVisibility);
    $("expAmount").addEventListener("input", recalculateFuelQty);
    $("expFuelRate").addEventListener("input", recalculateFuelQty);
    $("expTitle").addEventListener("input", () => {
      autoFilledFuelTitle = false;
    });
    $("expQuantity").addEventListener("input", () => {
      if ($("expCategory").value !== "fuel") return;
      const qty = Number($("expQuantity").value);
      const rate = Number($("expFuelRate").value);
      const amtRaw = $("expAmount").value.trim();
      if ((amtRaw === "" || Number(amtRaw) === 0) && qty > 0 && rate > 0) {
        $("expAmount").value = (qty * rate).toFixed(2);
        updateFuelCalcHint(qty * rate, rate, qty);
      } else {
        const hint = $("fuelCalcHint");
        if (hint && qty > 0) {
          hint.textContent = `Quantity set to ${qty.toFixed(2)} L/kWh.`;
          hint.classList.remove("is-active");
        }
      }
    });
    $("expBikeId").addEventListener("change", () => {
      const bike = state.bikes.find((b) => b.id === $("expBikeId").value);
      $("expOdometer").placeholder = bike ? `Current: ${bike.currentOdometer}` : "Optional";
    });
    $("srvType").addEventListener("change", toggleServiceTypeGroups);
    $("srvBikeId").addEventListener("change", () => {
      if (!$("srvId").value) {
        const bike = state.bikes.find((b) => b.id === $("srvBikeId").value);
        if (bike) $("srvLastDist").value = bike.currentOdometer;
      }
    });

    // Submit Expense Form
    $("expenseForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const id = $("expId").value;
      const bikeId = $("expBikeId").value;
      const date = $("expDate").value;
      const category = $("expCategory").value;
      const amount = Math.max(0, Number($("expAmount").value) || 0);
      const title = $("expTitle").value.trim();
      const odoRaw = $("expOdometer").value.trim();
      const odometer = odoRaw !== "" ? Math.max(0, Math.round(Number(odoRaw))) : null;
      const rateRaw = $("expFuelRate").value.trim();
      const parsedRate = rateRaw !== "" ? Math.max(0, Number(rateRaw)) : null;
      const fuelRate = category === "fuel" && parsedRate > 0 ? parsedRate : null;
      const qtyRaw = $("expQuantity").value.trim();
      let quantity = qtyRaw !== "" ? Math.max(0, Number(qtyRaw)) : null;
      if (category === "fuel" && quantity === null && fuelRate > 0 && amount > 0) {
        quantity = VeloStore.calcFuelQuantity(amount, fuelRate);
      }
      const notes = $("expNotes").value.trim();

      if (!bikeId || !title || !date) return;

      const payload = {
        id: id || VeloStore.generateId("exp"),
        bikeId,
        date,
        category,
        title,
        amount,
        odometer,
        quantity,
        fuelRate,
        notes
      };

      if (category === "fuel" && fuelRate > 0) {
        state.settings.fuelRate = fuelRate;
      }

      if (id) {
        const idx = state.expenses.findIndex((item) => item.id === id);
        if (idx !== -1) state.expenses[idx] = payload;
      } else {
        state.expenses.push(payload);
      }

      // Sync bike odometer upward if this reading is higher
      if (odometer !== null) {
        const bike = state.bikes.find((b) => b.id === bikeId);
        if (bike && odometer > bike.currentOdometer) {
          bike.currentOdometer = odometer;
        }
      }

      closeModal("expenseModal");
      persistAndRender();
      showToast(id ? "Expense updated." : "Expense logged.");
    });

    // Submit Bike Form
    $("bikeForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const id = $("bikeId").value;
      const name = $("bikeName").value.trim();
      if (!name) return;

      const startOdometer = Math.max(0, Math.round(Number($("bikeStartOdometer").value) || 0));
      const rawCurrent = Math.max(0, Math.round(Number($("bikeCurrentOdometer").value) || 0));
      const currentOdometer = Math.max(startOdometer, rawCurrent);

      const payload = {
        id: id || VeloStore.generateId("bike"),
        name,
        type: $("bikeType").value,
        color: $("bikeColor").value,
        purchasePrice: Math.max(0, Number($("bikePurchasePrice").value) || 0),
        purchaseDate: $("bikePurchaseDate").value || "",
        startOdometer,
        currentOdometer
      };

      if (id) {
        const idx = state.bikes.findIndex((b) => b.id === id);
        if (idx !== -1) state.bikes[idx] = payload;
      } else {
        state.bikes.push(payload);
      }

      closeModal("bikeModal");
      persistAndRender();
      showToast(id ? "Bike updated." : "Bike added to garage.");
    });

    // Submit Service Form
    $("serviceForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const id = $("srvId").value;
      const bikeId = $("srvBikeId").value;
      const type = $("srvType").value === "date" ? "date" : "distance";
      const title = $("srvTitle").value.trim();
      if (!bikeId || !title) return;

      const estRaw = $("srvEstCost").value.trim();
      const payload = {
        id: id || VeloStore.generateId("srv"),
        bikeId,
        type,
        title,
        intervalDist: Math.max(1, Math.round(Number($("srvIntervalDist").value) || 500)),
        lastDist: Math.max(0, Math.round(Number($("srvLastDist").value) || 0)),
        dueDate: $("srvDueDate").value || VeloStore.todayIso(),
        intervalMonths: Math.max(0, Math.round(Number($("srvIntervalMonths").value) || 0)),
        estCost: estRaw !== "" ? Math.max(0, Number(estRaw)) : null
      };

      if (id) {
        const idx = state.services.findIndex((s) => s.id === id);
        if (idx !== -1) state.services[idx] = payload;
      } else {
        state.services.push(payload);
      }

      closeModal("serviceModal");
      persistAndRender();
      showToast(id ? "Reminder updated." : "Service reminder added.");
    });

    // Settings Form & Data Management
    $("settingsForm").addEventListener("submit", (e) => {
      e.preventDefault();
      state.settings.currency = $("prefCurrency").value || "$";
      state.settings.distanceUnit = $("prefUnit").value === "mi" ? "mi" : "km";
      const rateRaw = $("prefFuelRate").value.trim();
      const parsedRate = Number(rateRaw);
      state.settings.fuelRate = rateRaw !== "" && Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : null;
      closeModal("settingsModal");
      persistAndRender();
      showToast("Preferences saved.");
    });

    $("installAppBtn").addEventListener("click", triggerPwaInstall);
    $("settingsInstallBtn").addEventListener("click", triggerPwaInstall);

    $("exportJsonBtn").addEventListener("click", () => {
      const json = JSON.stringify(state, null, 2);
      downloadFile(`veloledger-backup-${VeloStore.todayIso()}.json`, json, "application/json");
      showToast("JSON backup downloaded.");
    });

    $("importJsonInput").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          if (!parsed || !Array.isArray(parsed.bikes) || !Array.isArray(parsed.expenses)) {
            throw new Error("Invalid backup structure");
          }
          state = VeloStore.normalizeState(parsed);
          selectedBikeId = "all";
          closeModal("settingsModal");
          persistAndRender();
          showToast(`Imported ${state.bikes.length} bike(s) and ${state.expenses.length} expense(s).`);
        } catch (_err) {
          showToast("Could not import file: invalid JSON backup.");
        } finally {
          e.target.value = "";
        }
      };
      reader.readAsText(file);
    });

    $("resetSampleBtn").addEventListener("click", () => {
      if (!confirm("Replace current data with demo sample bikes and expenses?")) return;
      state = VeloStore.createSampleState(state.settings);
      selectedBikeId = "all";
      closeModal("settingsModal");
      persistAndRender();
      showToast("Sample data loaded.");
    });

    $("clearAllDataBtn").addEventListener("click", () => {
      if (!confirm("Permanently delete all bikes, expenses, and service reminders?")) return;
      state = VeloStore.createEmptyState(state.settings);
      selectedBikeId = "all";
      closeModal("settingsModal");
      persistAndRender();
      showToast("All data cleared.");
    });

    // Delegated Table & Garage Actions
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;

      const action = btn.dataset.action;
      const id = btn.dataset.id;

      if (action === "edit-expense") {
        const exp = state.expenses.find((x) => x.id === id);
        if (exp) openExpenseModal(exp);
      } else if (action === "delete-expense") {
        if (!confirm("Delete this expense entry?")) return;
        state.expenses = state.expenses.filter((x) => x.id !== id);
        persistAndRender();
        showToast("Expense deleted.");
      } else if (action === "log-for-bike") {
        openExpenseModal(null, id);
      } else if (action === "edit-bike") {
        const bike = state.bikes.find((b) => b.id === id);
        if (bike) openBikeModal(bike);
      } else if (action === "delete-bike") {
        const bike = state.bikes.find((b) => b.id === id);
        if (!bike) return;
        const expCount = state.expenses.filter((x) => x.bikeId === id).length;
        const msg = expCount > 0
          ? `Delete "${bike.name}" and its ${expCount} logged expense(s) & service reminders?`
          : `Delete "${bike.name}" from your garage?`;
        if (!confirm(msg)) return;
        state.bikes = state.bikes.filter((b) => b.id !== id);
        state.expenses = state.expenses.filter((x) => x.bikeId !== id);
        state.services = state.services.filter((s) => s.bikeId !== id);
        persistAndRender();
        showToast("Bike removed.");
      } else if (action === "edit-service") {
        const srv = state.services.find((s) => s.id === id);
        if (srv) openServiceModal(srv);
      } else if (action === "delete-service") {
        state.services = state.services.filter((s) => s.id !== id);
        persistAndRender();
        showToast("Reminder removed.");
      } else if (action === "complete-service") {
        const srv = state.services.find((s) => s.id === id);
        if (!srv) return;
        const bike = state.bikes.find((b) => b.id === srv.bikeId);
        if (srv.type === "distance" && bike) {
          srv.lastDist = bike.currentOdometer;
          persistAndRender();
          showToast(`"${srv.title}" reset at ${VeloStore.formatNumber(bike.currentOdometer)} ${state.settings.distanceUnit}.`);
        } else if (srv.type === "date") {
          if (srv.intervalMonths > 0) {
            srv.dueDate = VeloStore.addMonthsIso(VeloStore.todayIso(), srv.intervalMonths);
            persistAndRender();
            showToast(`"${srv.title}" rescheduled for ${VeloStore.formatDate(srv.dueDate)}.`);
          } else {
            state.services = state.services.filter((s) => s.id !== id);
            persistAndRender();
            showToast(`"${srv.title}" completed and cleared.`);
          }
        }
      }
    });
  }

  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function initPwa() {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      updatePwaInstallUi();
    });

    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      updatePwaInstallUi();
      showToast("VeloLedger installed!");
    });

    updatePwaInstallUi();

    if ("serviceWorker" in navigator && (location.protocol === "http:" || location.protocol === "https:")) {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        // Ignore registration issues in restricted environments
      });
    }
  }

  // Boot
  function init() {
    populateCategoryDropdowns();
    bindEvents();
    renderAll();
    initPwa();
  }

  init();
})();
