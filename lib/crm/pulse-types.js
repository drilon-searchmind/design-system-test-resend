/**
 * @typedef {object} PulseClient
 * @property {string} id
 * @property {string} name
 * @property {string} [industry]
 * @property {string} logo
 * @property {number} hue
 * @property {number} retainer
 * @property {number} [retainerBase] Static CRM field before signed contracts are added.
 * @property {number} [retainerFromContracts] Sum of signed active retainer/subscription contracts.
 * @property {string} currency
 * @property {string} status
 * @property {'ok' | 'warn' | 'bad'} health
 * @property {string} lastActivity
 * @property {string} owner
 * @property {Record<string, number>} allocation
 * @property {string[]} [servicesActive]
 * @property {string[]} [tags]
 * @property {number} hoursThisMonth
 * @property {number} hoursBudget
 * @property {number} [estimatedHoursOpen]
 * @property {number | null} [latestNps] Seneste NPS (0-100).
 * @property {number} [indeks] Apex YoY (seneste 30 dage), 100 = uændret. Kun sat når status er "ok".
 * @property {import("@/lib/crm/upsell-utils").UpsellItem[]} [upsells] Alle opsalg på kunden (nyeste først)
 * @property {{ amount: number; items: import("@/lib/crm/upsell-utils").UpsellItem[] }} [upsellMonth] Opsalg der gælder i den valgte periode (oven i MRR)
 * @property {string} [indeksStatus] ok | no_data | insufficient_history | error | pending
 * @property {string} [indeksComputedAt] ISO — hvornår Apex beregnede tallet (ældste domæne ved samlede rækker)
 * @property {boolean} [indeksPartial] Apex: nogle domæner mangler/fejlede
 * @property {string} [cvr]
 * @property {string | null} [terminatedAt]
 * @property {string[]} [churnReason]
 * @property {string | null} [churnNote]
 * @property {string | null} [leadSource]
 * @property {string | null} [googleDriveUrl]
 * @property {number} [annualAdjustmentPct]
 * @property {string | null} [lastContactedAt]
 * @property {number} [clv]
 * @property {Record<string, string | null>} [deptAssignees]
 */

/**
 * @typedef {object} PulseDepartment
 * @property {string} id
 * @property {string} name
 * @property {string} color
 * @property {string} short
 * @property {number} capacity
 */

/**
 * @typedef {object} PulseAgencyMetrics
 * @property {number} retainerMRR
 * @property {number} [upsellMrr] Opsalg der gælder i perioden (oven i fast MRR)
 * @property {number} retainerMRRPrev Forrige måneds MRR (snapshot eller udledt af nye/churn/opsalg)
 * @property {number | null} [avgMarginPrev] Forrige måneds gns. margin hvis der findes et snapshot
 * @property {number} [overheadHoursMonth]
 * @property {number} utilisation
 * @property {number} utilisationPrev
 * @property {number} overheadPct
 * @property {number} overheadPctPrev
 * @property {number} billableHoursMonth
 * @property {number} billableHoursPrev
 * @property {number} avgMargin
 * @property {number} activeClients
 * @property {number} healthyClients
 * @property {number} warnClients
 * @property {number} badClients
 */

/**
 * @typedef {object} PulseDeptPerformance
 * @property {string} dept
 * @property {number} revenue
 * @property {number} hours
 * @property {number} budget
 * @property {number} util
 * @property {number} [estimatedHoursOpen]
 * @property {boolean} [budgetFromClients]
 * @property {{ total: number; fromBudgets: number; fromAllocation: number; fromUpsells: number }} [soldMrrBreakdown] Hvor solgt MRR kommer fra
 */

/**
 * @typedef {object} PulseUtilTrendPoint
 * @property {number} day
 * @property {number} billable
 * @property {number} overhead
 */

/**
 * @typedef {object} PulseSmartAlert
 * @property {string} id
 * @property {'bad' | 'warn'} severity
 * @property {string} [client]
 * @property {string} type
 * @property {string} title
 * @property {string} body
 * @property {string} age
 */

/**
 * @typedef {object} PulseTeamMember
 * @property {string} id
 * @property {string} name
 * @property {string} role
 * @property {string} dept
 * @property {string} avatar
 * @property {number} hue
 * @property {number} weeklyHours
 */

/**
 * @typedef {object} PulseReportPeriod
 * @property {number} year
 * @property {number} month
 * @property {string} label
 * @property {boolean} isCurrent
 */

/**
 * @typedef {object} PulseBundle
 * @property {'demo' | 'database'} source
 * @property {PulseReportPeriod} period
 * @property {PulseAgencyMetrics} agencyMetrics
 * @property {PulseClient[]} clients
 * @property {PulseDepartment[]} departments
 * @property {import("@/lib/crm/pulse-kpi-utils").MrrBridge} [mrrBridge]
 * @property {PulseDeptPerformance[]} deptPerformance
 * @property {PulseUtilTrendPoint[]} utilTrend
 * @property {PulseSmartAlert[]} smartAlerts
 * @property {PulseTeamMember[]} team
 * @property {import("@/lib/crm/agency-settings").AgencySettings} [agencySettings] justerbare nøgletal-parametre
 */

export {};
