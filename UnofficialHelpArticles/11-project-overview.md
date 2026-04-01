########
Title: Project Overview Tab
Slug: project-overview
Summary: Understand your project at a glance with stats cards, progress bars, and suggested actions.
Sort Order: 11
########

## 🔎 Table of Contents

1. [What is the Overview Tab?](olio://help-anchor/what-is-the-overview-tab)
2. [Stats Cards](olio://help-anchor/stats-cards)
3. [Progress Bars](olio://help-anchor/progress-bars)
4. [Suggested Actions](olio://help-anchor/suggested-actions)
5. [Quick Navigation](olio://help-anchor/quick-navigation)
6. [AI Plan Generation](olio://help-anchor/ai-plan-generation)

---

# 📊 Project Overview Tab

The **Overview Tab** is the first thing you see when you open a project. It aggregates data from all other project tabs into a single at-a-glance dashboard, giving you a snapshot of progress, workload, and where to focus next.

---

## 🧩 What is the Overview Tab?

The Overview Tab answers three questions:

1. **How much work exists?** (Stats Cards)
2. **How much is done?** (Progress Bars)
3. **What should I do next?** (Suggested Actions)

It doesn't store any data of its own — everything displayed is pulled live from your Board, Planner, Files, and Resources tabs.

---

## 📈 Stats Cards

Four stat cards summarize the scope of your project:

| Card | What It Shows |
|:-----|:-------------|
| **Board Cards** | Total open cards across all board columns |
| **Planner Steps** | Total steps in the planner (excluding archived) |
| **Files** | Total documents and uploaded files |
| **Resources** | Total external links saved |

Each card shows both a **completed count** and a **total count** where applicable (e.g., `5 / 12 cards complete`).

---

## 📉 Progress Bars

The overall project progress is a **weighted combination** of two metrics:

| Source | Weight |
|:-------|:------:|
| Board card completion | 70% |
| Planner step completion | 30% |

The combined score determines the **progress label**:

| Score | Label |
|:-----:|:------|
| 80%+ | Strong momentum |
| 50–79% | Steady progress |
| Below 50% | Needs focus |

> 💡 **Tip:** The board carries more weight in the progress calculation because it typically tracks day-to-day tasks. Use the planner for milestone-level tracking.

---

## 💡 Suggested Actions

Below the progress bars, the system suggests where to direct your attention based on current workload:

- If you have many **open board cards**, it recommends focusing on the Board
- If you have many **incomplete planner steps**, it recommends the Planner
- If all steps and cards are complete, it surfaces a congratulatory message

These suggestions are heuristic — use them as a prompt, not a directive.

---

## 🧭 Quick Navigation

Each **stat card is clickable**. Clicking a card jumps you directly to the corresponding tab:

| Card | Navigates To |
|:-----|:------------|
| Board Cards | Board Tab |
| Planner Steps | Planner Tab |
| Files | Files Tab |
| Resources | Resources Tab |

This makes the Overview a fast navigation hub for large projects.

---

## 🤖 AI Plan Generation

The Overview Tab surfaces the **Generate AI Plan** option if your project doesn't yet have planner steps. Clicking it opens the AI plan generation interface in the Planner tab.

See the [Project Planner](olio://help/project-planner) article for full details on AI plan generation, including usage limits.
