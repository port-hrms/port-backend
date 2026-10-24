// server/seed/demoData.js
// ─────────────────────────────────────────────────────────────
// Fills the database in MONGO_URI with realistic demo data so every
// dashboard and module has something to show.
//
// Usage (from /server):
//   npm run seed:demo           → add demo data (skips if already present)
//   npm run seed:demo -- --reset → remove previous demo data, then add fresh
//   npm run seed:demo -- --clean → only remove demo data
//
// Everything created here is tagged so it can be removed safely:
//   • demo employees / clients use emails ending in @dreamonix-demo.com
//   • other records are authored by the demo "HR Team" user
// Existing (non-demo) records are never modified or deleted.
// ─────────────────────────────────────────────────────────────

const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const User = require("../models/User");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const WFHRequest = require("../models/WFHRequest");
const Payroll = require("../models/Payroll");
const Performance = require("../models/Performance");
const Task = require("../models/Task");
const Announcement = require("../models/Announcement");
const Holiday = require("../models/Holiday");
const Client = require("../models/Client");
const Quotation = require("../models/Quotation");
const Invoice = require("../models/Invoice");
const Job = require("../models/Job");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
const Advance = require("../models/Advance");

const DOMAIN = "dreamonix-demo.com";
const DEMO_PASSWORD = "Demo@123";
const HR_TEAM_EMAIL = `hr-team@${DOMAIN}`;

// ─── Deterministic random (same data every run) ──────────────
let seed = 42;
const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (min, max) => Math.round(min + rand() * (max - min));

// ─── Date helpers (attendance stores the IST calendar day as UTC midnight) ──
const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const day = (str) => new Date(`${str}T00:00:00.000Z`);
const addDays = (str, n) => {
    const d = day(str);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};
const today = day(todayStr);
const [Y, M] = todayStr.split("-").map(Number);
const prevMonth = M === 1 ? { month: 12, year: Y - 1 } : { month: M - 1, year: Y };

const fmt12 = (mins) => {
    const h24 = Math.floor(mins / 60);
    const m = mins % 60;
    const period = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
};

// ─── Reference data ──────────────────────────────────────────
const EMPLOYEES = [
    ["Ananya", "Mishra", "Female", "Engineering", "Senior Software Engineer", 95000],
    ["Rohan", "Das", "Male", "Engineering", "Frontend Developer", 62000],
    ["Priya", "Patnaik", "Female", "Design", "UI/UX Designer", 58000],
    ["Subham", "Mohanty", "Male", "Operations", "Port Operations Lead", 72000],
    ["Sneha", "Sahoo", "Female", "HR", "HR Executive", 45000],
    ["Arjun", "Nayak", "Male", "Sales", "Business Development Manager", 80000],
    ["Kavya", "Rath", "Female", "Finance", "Accounts Officer", 52000],
    ["Aditya", "Panda", "Male", "Engineering", "Backend Developer", 68000],
    ["Riya", "Behera", "Female", "Marketing", "Digital Marketing Specialist", 48000],
    ["Manas", "Swain", "Male", "Operations", "Logistics Coordinator", 41000],
    ["Pooja", "Jena", "Female", "Engineering", "QA Engineer", 50000],
    ["Sourav", "Pradhan", "Male", "Sales", "Sales Executive", 38000],
];

// Indian public holidays (2026 dates)
const HOLIDAYS = [
    ["Gandhi Jayanti", "2026-10-02", "National", "#E85E4A"],
    ["Dussehra", "2026-10-20", "Religious", "#F2A33A"],
    ["Diwali", "2026-11-08", "Religious", "#F2A33A"],
    ["Guru Nanak Jayanti", "2026-11-24", "Religious", "#2B8AAF"],
    ["Christmas", "2026-12-25", "National", "#2F9E6E"],
    ["Company Foundation Day", "2026-12-12", "Company", "#1E88C8"],
];
const HOLIDAY_SET = new Set(HOLIDAYS.map(([, d]) => d));

// ─── Cleanup ─────────────────────────────────────────────────
async function clean() {
    const demoEmployees = await Employee.find({ email: new RegExp(`@${DOMAIN.replace(".", "\\.")}$`) }).select("_id");
    const empIds = demoEmployees.map((e) => e._id);
    const hrTeam = await User.findOne({ email: HR_TEAM_EMAIL }).select("_id");
    const demoClients = await Client.find({ email: new RegExp(`@${DOMAIN.replace(".", "\\.")}$`) }).select("_id");
    const clientIds = demoClients.map((c) => c._id);

    const byEmp = { employee: { $in: empIds } };
    await Promise.all([
        Attendance.deleteMany(byEmp).setOptions({ withDeleted: true }),
        Leave.deleteMany(byEmp),
        WFHRequest.deleteMany(byEmp),
        Payroll.deleteMany(byEmp),
        Performance.deleteMany(byEmp),
        Task.deleteMany(byEmp),
        Advance.deleteMany(byEmp),
        Invoice.deleteMany({ clientId: { $in: clientIds } }),
        Quotation.deleteMany({ clientId: { $in: clientIds } }),
    ]);
    await Client.deleteMany({ _id: { $in: clientIds } });

    if (hrTeam) {
        await Promise.all([
            Announcement.deleteMany({ author: hrTeam._id }),
            Holiday.deleteMany({ createdBy: hrTeam._id }),
            Job.deleteMany({ postedBy: hrTeam._id }),
            Expense.deleteMany({ createdBy: hrTeam._id }),
            Income.deleteMany({ createdBy: hrTeam._id }),
            Task.deleteMany({ assignedBy: hrTeam._id }),
        ]);
    }

    await User.deleteMany({ email: new RegExp(`@${DOMAIN.replace(".", "\\.")}$`) });
    await Employee.deleteMany({ _id: { $in: empIds } });
    console.log(`🧹 Removed demo data (${empIds.length} employees, ${clientIds.length} clients)`);
}

// ─── Builders ────────────────────────────────────────────────
async function createPeople() {
    const hrTeam = await User.create({
        name: "HR Team",
        email: HR_TEAM_EMAIL,
        password: `${DEMO_PASSWORD}-hr`,
        role: "admin",
    });

    const employees = [];
    for (const [i, [firstName, lastName, gender, department, designation, salary]] of EMPLOYEES.entries()) {
        const email = `${firstName}.${lastName}@${DOMAIN}`.toLowerCase();
        // One birthday today, the rest spread across the year
        const dob = i === 2
            ? new Date(Date.UTC(1996, M - 1, Number(todayStr.slice(8)))) // birthday today
            : new Date(Date.UTC(between(1988, 2001), between(0, 11), between(1, 28)));

        const employee = await Employee.create({
            firstName,
            lastName,
            email,
            phone: `9${between(100000000, 999999999)}`,
            gender,
            dateOfBirth: dob,
            address: pick(["Paradeep, Jagatsinghpur", "Bhubaneswar, Khordha", "Cuttack", "Kujang, Jagatsinghpur"]),
            department,
            designation,
            employmentType: i === 11 ? "Intern" : i === 9 ? "Contract" : "Full-Time",
            joiningDate: new Date(Date.UTC(between(2021, 2026), between(0, 7), between(1, 28))),
            salary,
            status: i === 6 ? "On Leave" : "Active",
            isFieldAgent: i === 9,
        });
        await User.create({
            name: `${firstName} ${lastName}`,
            email,
            password: DEMO_PASSWORD,
            role: "employee",
            employee: employee._id,
        });
        employees.push(employee);
    }
    return { hrTeam, employees };
}

async function createAttendance(employees) {
    const docs = [];
    const start = `${prevMonth.year}-${String(prevMonth.month).padStart(2, "0")}-01`;

    for (const [i, emp] of employees.entries()) {
        for (let d = start; d <= todayStr; d = addDays(d, 1)) {
            if (day(d).getUTCDay() === 0 || HOLIDAY_SET.has(d)) continue; // Sundays + holidays off
            const isToday = d === todayStr;

            // Today: employee #6 is on leave, two have not checked in yet
            if (isToday && (i === 4 || i === 10)) continue;
            if (isToday && i === 6) {
                docs.push({ employee: emp._id, date: day(d), status: "On Leave", leaveType: "Casual Leave" });
                continue;
            }

            const r = rand();
            let status = "Present";
            let inMin = between(9 * 60 + 35, 10 * 60 + 18);
            if (r > 0.97) {
                docs.push({ employee: emp._id, date: day(d), status: "Absent" });
                continue;
            } else if (r > 0.94) {
                docs.push({ employee: emp._id, date: day(d), status: "On Leave", leaveType: pick(["Sick Leave", "Casual Leave"]) });
                continue;
            } else if (r > 0.91) {
                status = "Half Day";
                inMin = between(13 * 60 + 5, 13 * 60 + 40);
            } else if (r > 0.83) {
                status = "Late";
                inMin = between(10 * 60 + 32, 11 * 60 + 45);
            }

            const outMin = isToday ? null : between(17 * 60 + 25, 18 * 60 + 40);
            docs.push({
                employee: emp._id,
                date: day(d),
                status,
                checkIn: fmt12(inMin),
                checkOut: outMin ? fmt12(outMin) : "",
                hoursWorked: outMin ? Number(((outMin - inMin) / 60).toFixed(2)) : 0,
                workMode: rand() > 0.92 ? "WFH" : "Office",
            });
        }
    }
    await Attendance.insertMany(docs);
    return docs.length;
}

async function createLeavesAndWfh(employees, hrTeam) {
    const leaves = [
        [6, "Casual Leave", todayStr, addDays(todayStr, 1), 2, "Family function in Cuttack", "Approved"],
        [1, "Sick Leave", addDays(todayStr, -12), addDays(todayStr, -11), 2, "Viral fever", "Approved"],
        [3, "Earned Leave", addDays(todayStr, 6), addDays(todayStr, 10), 5, "Trip to Puri with family", "Pending"],
        [8, "Casual Leave", addDays(todayStr, 3), addDays(todayStr, 3), 1, "Personal work at bank", "Pending"],
        [0, "Special Leave", addDays(todayStr, 14), addDays(todayStr, 15), 2, "Attending tech conference", "Pending"],
        [5, "Casual Leave", addDays(todayStr, -20), addDays(todayStr, -20), 1, "Vehicle registration", "Rejected"],
        [10, "Sick Leave", addDays(todayStr, -5), addDays(todayStr, -5), 1, "Dental appointment", "Approved"],
    ];
    await Leave.insertMany(leaves.map(([i, leaveType, s, e, n, reason, status]) => ({
        employee: employees[i]._id,
        leaveType,
        startDate: day(s),
        endDate: day(e),
        numberOfDays: n,
        reason,
        status,
        approvedBy: status === "Pending" ? null : hrTeam._id,
        managerNotes: status === "Rejected" ? "Quarter-end closing week, please reschedule." : "",
    })));

    const wfh = [
        [7, todayStr, todayStr, 1, "Waiting for internet installation at new flat", "Approved"],
        [2, addDays(todayStr, 2), addDays(todayStr, 3), 2, "Design sprint, focused work", "Pending"],
        [0, addDays(todayStr, -8), addDays(todayStr, -8), 1, "Plumber visit at home", "Approved"],
        [9, addDays(todayStr, 5), addDays(todayStr, 5), 1, "Field visit report writing", "Pending"],
    ];
    await WFHRequest.insertMany(wfh.map(([i, s, e, n, reason, status]) => ({
        employee: employees[i]._id,
        startDate: day(s),
        endDate: day(e),
        numberOfDays: n,
        reason,
        status,
        approvedBy: status === "Pending" ? null : hrTeam._id,
    })));
    return leaves.length + wfh.length;
}

async function createPayroll(employees) {
    const docs = [];
    for (const [i, emp] of employees.entries()) {
        const basic = Math.round(emp.salary * 0.5);
        const hra = Math.round(emp.salary * 0.25);
        const special = emp.salary - basic - hra;
        for (const period of [prevMonth, { month: M, year: Y }]) {
            const isCurrent = period.month === M;
            docs.push({
                employee: emp._id,
                month: period.month,
                year: period.year,
                attendance: { workingDays: 26, presentDays: between(23, 26), lopDays: rand() > 0.85 ? 1 : 0 },
                earnings: { basic, hra, bonus: special + (i % 4 === 0 ? 2000 : 0) },
                deductions: { pf: Math.round(basic * 0.12), esi: 0, ptax: 200, leaveDeduction: 0 },
                payment: isCurrent
                    ? { status: i < 4 ? "Processed" : "Draft", mode: "" }
                    : { status: "Paid", mode: "Bank Transfer", date: day(`${period.year}-${String(period.month).padStart(2, "0")}-28`) },
            });
        }
    }
    await Payroll.insertMany(docs);
    return docs.length;
}

async function createPerformance(employees) {
    const kpiSets = {
        Engineering: ["Sprint delivery", "Code quality", "Bug turnaround"],
        Design: ["Design delivery", "Usability feedback", "Design system upkeep"],
        Operations: ["Vessel turnaround time", "Safety compliance", "Cargo handling accuracy"],
        HR: ["Hiring closure", "Employee engagement", "Policy compliance"],
        Sales: ["Revenue target", "New accounts", "Client retention"],
        Finance: ["Month-end closing", "Audit readiness", "Payment accuracy"],
        Marketing: ["Lead generation", "Campaign ROI", "Content calendar"],
    };
    let count = 0;
    for (const [i, emp] of employees.entries()) {
        if (i === 11) continue; // intern: no review yet
        const level = [0.95, 0.82, 0.9, 0.88, 0.76, 0.93, 0.7, 0.84, 0.66, 0.58, 0.8][i];
        await Performance.create({
            employee: emp._id,
            reviewerName: "HR Team",
            reviewCycle: "Q3",
            year: Y,
            reviewDate: day(addDays(todayStr, -between(10, 25))),
            kpis: kpiSets[emp.department].map((title) => ({
                title,
                target: 100,
                achieved: Math.min(100, Math.round(level * 100 + between(-6, 6))),
                weight: 1,
            })),
            strengths: pick(["Ownership and reliability", "Clear communication with stakeholders", "Strong problem solving"]),
            areasOfImprovement: pick(["Documentation", "Delegation", "Time estimation"]),
            goals: "Lead one improvement initiative next quarter.",
            managerComments: level >= 0.85 ? "Excellent quarter, keep it up." : "Solid work; focus on the agreed goals.",
            technicalSkills: between(3, 5),
            communication: between(3, 5),
            teamwork: between(3, 5),
        });
        count++;
    }
    return count;
}

async function createTasks(employees, hrTeam) {
    const titles = [
        ["Update vessel arrival schedule", "Sync berth plan with port authority sheet"],
        ["Fix payroll export bug", "CSV export skips employees with no PAN"],
        ["Prepare onboarding kit", "For two new joiners next Monday"],
        ["Client demo deck", "Highlight live tracking and payroll modules"],
        ["Review GST invoices", "Cross-check October invoices before filing"],
        ["Social media calendar", "Plan November posts"],
        ["Safety drill report", "Summarise Thursday's fire drill"],
        ["API load testing", "Run k6 scripts on staging"],
    ];
    const statuses = ["Completed", "In Progress", "Pending"];
    const docs = titles.map(([title, description], k) => ({
        employee: employees[[3, 7, 4, 5, 6, 8, 9, 0][k]]._id,
        assignedBy: hrTeam._id,
        date: today,
        title,
        description,
        status: statuses[k % 3],
    }));
    // A couple of tasks from yesterday too
    docs.push(
        { employee: employees[1]._id, assignedBy: hrTeam._id, date: day(addDays(todayStr, -1)), title: "Polish dashboard cards", description: "Match new port theme", status: "Completed" },
        { employee: employees[2]._id, assignedBy: hrTeam._id, date: today, title: "Payslip layout review", description: "Check print margins", status: "In Progress" },
    );
    await Task.insertMany(docs);
    return docs.length;
}

async function createCompanyContent(hrTeam) {
    await Announcement.insertMany([
        { title: "Diwali celebration on 7th November 🎉", content: "Join us at the office lawn at 5 PM for rangoli, snacks and the annual awards. Families are welcome!", author: hrTeam._id, isPinned: true },
        { title: "New attendance check-in with location", content: "Check-in now verifies your location. Please allow location access in your browser when prompted.", author: hrTeam._id },
        { title: "Q3 performance reviews are out", content: "You can view your Q3 review under Performance. Reach out to HR for a one-on-one discussion.", author: hrTeam._id },
        { title: "Safety drill this Thursday", content: "A fire-safety drill will be held at 11 AM. Please follow the floor wardens' instructions.", author: hrTeam._id },
        { title: "Welcome to our new joiners", content: "Please welcome Pooja (QA) and Sourav (Sales) to the Dreamonix family.", author: hrTeam._id },
    ]);
    await Holiday.insertMany(HOLIDAYS.map(([name, date, type, color]) => ({
        name, date: day(date), type, color, createdBy: hrTeam._id, description: `${name} holiday`,
    })));
    await Job.insertMany([
        { title: "React Developer", department: "Engineering", location: "Bhubaneswar", jobType: "Full-Time", experienceLevel: "1-2 Years", salaryMin: 400000, salaryMax: 700000, description: "Build and maintain our HRMS web app.", requirements: "React, Tailwind, REST APIs", responsibilities: "Feature development, code reviews", status: "Active", deadline: day(addDays(todayStr, 30)), postedBy: hrTeam._id },
        { title: "Port Operations Executive", department: "Operations", location: "Paradeep", jobType: "Full-Time", experienceLevel: "3-5 Years", salaryMin: 350000, salaryMax: 550000, description: "Coordinate berth planning and cargo operations.", requirements: "Port/logistics experience", responsibilities: "Daily operations reporting", status: "Active", deadline: day(addDays(todayStr, 21)), postedBy: hrTeam._id },
        { title: "HR Intern", department: "HR", location: "Bhubaneswar", jobType: "Intern", experienceLevel: "Fresher", salaryMin: 120000, salaryMax: 180000, description: "Support recruitment and onboarding.", requirements: "MBA HR pursuing", responsibilities: "Screening, scheduling", status: "Active", deadline: day(addDays(todayStr, 14)), postedBy: hrTeam._id },
        { title: "Graphic Designer", department: "Design", location: "Remote", jobType: "Contract", experienceLevel: "1-2 Years", salaryMin: 300000, salaryMax: 450000, description: "Marketing creatives and brand assets.", requirements: "Figma, Illustrator", responsibilities: "Campaign creatives", status: "Closed", postedBy: hrTeam._id },
    ]);
}

async function createFinance(employees, hrTeam) {
    const clientsData = [
        ["Rakesh Mohapatra", "Kalinga Shipping Agency", "Paradeep Port Road, Paradeep"],
        ["Neha Agarwal", "Mahanadi Logistics Pvt Ltd", "Jagatsinghpur, Odisha"],
        ["Vikram Singh", "Eastern Cargo Movers", "Haldia, West Bengal"],
        ["Deepak Rout", "Coastal Fisheries Co-op", "Kujang, Odisha"],
        ["Ritu Sharma", "BlueWave Marine Services", "Visakhapatnam, AP"],
    ];
    const clients = [];
    for (const [name, companyName, address] of clientsData) {
        clients.push(await Client.create({
            name,
            companyName,
            email: `${name.split(" ")[0].toLowerCase()}@${DOMAIN}`,
            phone: `9${between(100000000, 999999999)}`,
            address,
            status: "Active",
        }));
    }

    const services = [
        ["HRMS subscription (annual)", 120000],
        ["Payroll module setup", 35000],
        ["Live tracking for field agents", 48000],
        ["Custom reports", 22000],
        ["On-site training (2 days)", 18000],
    ];
    const quotationStatuses = ["Approved", "Approved", "Pending", "Approved", "Rejected", "Pending"];
    const quotations = [];
    for (let k = 0; k < 6; k++) {
        const items = [services[k % 5], services[(k + 2) % 5]].map(([service, price]) => ({ service, description: "", quantity: 1, price }));
        const subtotal = items.reduce((s, it) => s + it.price, 0);
        const tax = Math.round(subtotal * 0.18);
        quotations.push(await Quotation.create({
            clientId: clients[k % 5]._id,
            items,
            subtotal,
            tax,
            total: subtotal + tax,
            status: quotationStatuses[k],
            validTill: day(addDays(todayStr, 30 - k * 4)),
        }));
    }

    const invoiceStatuses = ["Paid", "Paid", "Partial", "Unpaid", "Overdue"];
    for (let k = 0; k < 5; k++) {
        const q = quotations[k];
        const status = invoiceStatuses[k];
        await Invoice.create({
            quotationId: q._id,
            clientId: q.clientId,
            items: q.items,
            subtotal: q.subtotal,
            tax: q.tax,
            amount: q.total,
            dueDate: day(addDays(todayStr, status === "Overdue" ? -7 : 15 - k)),
            paymentStatus: status,
            paymentDate: status === "Paid" ? day(addDays(todayStr, -k * 3 - 2)) : null,
            transactionId: status === "Paid" ? `UTR${between(100000000, 999999999)}` : "",
        });
    }

    const expenses = [
        ["Office stationery", "Office Supplies", 4200, "UPI"],
        ["Cloud hosting (Render + Atlas)", "IT & Software", 9800, "Card"],
        ["Team cab to Paradeep site", "Transport", 3600, "Cash"],
        ["Diwali sweets & decor", "Food & Entertainment", 12500, "UPI"],
        ["AC servicing", "Maintenance", 5400, "Bank Transfer"],
        ["LinkedIn job ads", "Marketing", 15000, "Card"],
        ["Electricity bill", "Utilities", 8700, "Bank Transfer"],
        ["Printer toner", "Office Supplies", 2900, "UPI"],
    ];
    await Expense.insertMany(expenses.map(([title, category, amount, mode], k) => ({
        title, category, amount, mode, date: day(addDays(todayStr, -k * 6)), createdBy: hrTeam._id,
    })));

    const incomes = [
        ["Client Payment", "Kalinga Shipping Agency", 182900, "Bank Transfer"],
        ["Project Payment", "Mahanadi Logistics Pvt Ltd", 98000, "Bank Transfer"],
        ["Retainer Fee", "Eastern Cargo Movers", 45000, "UPI"],
        ["Consulting", "BlueWave Marine Services", 30000, "Cheque"],
        ["Client Payment", "Coastal Fisheries Co-op", 60000, "Bank Transfer"],
    ];
    await Income.insertMany(incomes.map(([source, clientName, amount, method], k) => ({
        source, clientName, amount, method, date: day(addDays(todayStr, -k * 9 - 1)), createdBy: hrTeam._id,
    })));

    await Advance.insertMany([
        { employee: employees[9]._id, amount: 15000, date: day(addDays(todayStr, -40)), deductionType: "Installments", installmentAmount: 5000, paid: 10000, status: "Active", notes: "Medical emergency", createdBy: hrTeam._id },
        { employee: employees[1]._id, amount: 8000, date: day(addDays(todayStr, -70)), deductionType: "Full", installmentAmount: 0, paid: 8000, status: "Cleared", notes: "Laptop repair", createdBy: hrTeam._id },
    ]);
    return { clients: clients.length, quotations: quotations.length, invoices: 5 };
}

// ─── Main ────────────────────────────────────────────────────
(async () => {
    const args = process.argv.slice(2);
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const host = mongoose.connection.host;
        console.log(`✅ Connected to MongoDB (${host}/${mongoose.connection.name})`);

        if (args.includes("--reset") || args.includes("--clean")) await clean();
        if (args.includes("--clean")) return process.exit(0);

        if (await User.exists({ email: HR_TEAM_EMAIL })) {
            console.log("ℹ️  Demo data already present. Run with --reset to recreate it.");
            return process.exit(0);
        }

        const { hrTeam, employees } = await createPeople();
        const attendance = await createAttendance(employees);
        const requests = await createLeavesAndWfh(employees, hrTeam);
        const payroll = await createPayroll(employees);
        const reviews = await createPerformance(employees);
        const tasks = await createTasks(employees, hrTeam);
        await createCompanyContent(hrTeam);
        const finance = await createFinance(employees, hrTeam);

        console.log("\n🎉 Demo data created:");
        console.table({
            Employees: employees.length,
            "Attendance records": attendance,
            "Leave + WFH requests": requests,
            "Payroll records": payroll,
            "Performance reviews": reviews,
            Tasks: tasks,
            "Announcements / Holidays / Jobs": "5 / 6 / 4",
            Clients: finance.clients,
            Quotations: finance.quotations,
            Invoices: finance.invoices,
            "Expenses / Income / Advances": "8 / 5 / 2",
        });
        console.log(`\nEmployee logins: firstname.lastname@${DOMAIN} / ${DEMO_PASSWORD}`);
        console.log(`  e.g. ananya.mishra@${DOMAIN} / ${DEMO_PASSWORD}`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Demo seed failed:", error.message);
        process.exit(1);
    }
})();
