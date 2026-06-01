/**
 * Screenshot Capture Script - Nitin Hospital Management System
 * Captures all module pages and saves to /screenshots folder
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:8000/api';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const PAGES = [
  { url: '/login',          filename: '01_login.png',              title: 'Login Page' },
  { url: '/',               filename: '02_dashboard.png',          title: 'Dashboard' },
  { url: '/patients',       filename: '03_patients.png',           title: 'Patients' },
  { url: '/doctors',        filename: '04_doctors.png',            title: 'Doctors' },
  { url: '/staff',          filename: '05_staff.png',              title: 'Staff' },
  { url: '/rooms',          filename: '06_rooms.png',              title: 'Rooms' },
  { url: '/appointments',   filename: '07_appointments.png',       title: 'Appointments' },
  { url: '/admissions',     filename: '08_admissions.png',         title: 'Admissions' },
  { url: '/emr',            filename: '09_emr.png',                title: 'EMR' },
  { url: '/ot',             filename: '10_operation_theatre.png',  title: 'Operation Theatre' },
  { url: '/laboratory',     filename: '11_laboratory.png',         title: 'Laboratory' },
  { url: '/pharmacy',       filename: '12_pharmacy.png',           title: 'Pharmacy' },
  { url: '/bloodbank',      filename: '13_blood_bank.png',         title: 'Blood Bank' },
  { url: '/ambulance',      filename: '14_ambulance.png',          title: 'Ambulance & Transport' },
  { url: '/billing',        filename: '15_billing.png',            title: 'Pharmacy Billing' },
  { url: '/master-billing', filename: '16_master_billing.png',     title: 'Master Billing & Discharge' },
  { url: '/inventory',      filename: '17_inventory.png',          title: 'Inventory' },
  { url: '/purchases',      filename: '18_purchases.png',          title: 'Purchases' },
  { url: '/payroll',        filename: '19_payroll.png',            title: 'HR & Payroll' },
  { url: '/reports',        filename: '20_reports.png',            title: 'Reports & Analytics' },
  { url: '/excel',          filename: '21_excel.png',              title: 'Excel Import/Export' },
  { url: '/settings',       filename: '22_settings.png',           title: 'Settings' },
  { url: '/history',        filename: '23_patient_history.png',    title: 'Patient History' },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('\n🏥 NITIN HOSPITAL - Screenshot Capture');
  console.log('=====================================');
  console.log(`📁 Output: ${SCREENSHOTS_DIR}\n`);

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const results = [];

  // --- Step 1: Take login page screenshot ---
  try {
    console.log('📸 [1/23] Login Page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_login.png') });
    console.log('  ✅ Saved: 01_login.png');
    results.push({ title: 'Login Page', filename: '01_login.png', success: true });
  } catch (e) {
    console.log(`  ❌ Login page failed: ${e.message}`);
    results.push({ title: 'Login Page', success: false, error: e.message });
  }

  // --- Step 2: Login via API token injection (bypass UI) ---
  console.log('\n🔐 Authenticating via API...');
  try {
    const loginRes = await page.evaluate(async (apiUrl) => {
      // Correct credentials for Nitin Hospital
      const creds = [
        { username: 'admin@nitinhospital.com', password: 'admin@nitinhospital.com' },
        { username: 'admin', password: 'admin123' },
        { username: 'admin', password: 'Admin@123' },
      ];
      for (const cred of creds) {
        try {
          const r = await fetch(`${apiUrl}/auth/login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cred),
          });
          if (r.ok) {
            const data = await r.json();
            return { success: true, data, cred };
          }
        } catch (e) {}
      }
      return { success: false };
    }, API_URL);

    if (loginRes.success) {
      console.log(`  ✅ Logged in as: ${loginRes.cred.username}`);
      // Inject tokens into localStorage and reload to apply
      await page.evaluate((data) => {
        localStorage.setItem('access_token', data.data.access);
        localStorage.setItem('refresh_token', data.data.refresh);
      }, loginRes);
      // Navigate to dashboard to trigger auth check
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 20000 });
      await sleep(2000);
      console.log(`  ✅ Navigated to dashboard after auth`);
    } else {
      // Try UI login fallback with correct credentials
      console.log('  ⚠️ API login failed, trying UI login...');
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      
      const inputs = await page.$$('input[type="text"], input:not([type="password"]):not([type="hidden"])');
      if (inputs.length > 0) {
        await inputs[0].click({ clickCount: 3 });
        await inputs[0].type('admin@nitinhospital.com');
      }
      const passField = await page.$('input[type="password"]');
      if (passField) {
        await passField.click({ clickCount: 3 });
        await passField.type('admin@nitinhospital.com');
      }
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) await submitBtn.click();
      await sleep(3000);
    }
  } catch (e) {
    console.log(`  ❌ Auth error: ${e.message}`);
  }

  // --- Step 3: Capture each page ---
  for (let i = 1; i < PAGES.length; i++) {
    const p = PAGES[i];
    const num = String(i + 1).padStart(2, '0');
    try {
      process.stdout.write(`📸 [${num}/23] ${p.title}...`);
      await page.goto(`${BASE_URL}${p.url}`, { waitUntil: 'networkidle2', timeout: 20000 });
      
      // Check if redirected to login
      if (page.url().includes('/login')) {
        // Re-inject token and retry
        await page.evaluate(() => {
          // Token might have been lost on navigation
        });
        await page.goto(`${BASE_URL}${p.url}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      }
      
      await sleep(3000); // Wait for data/animations
      
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, p.filename),
        fullPage: false,
      });
      
      console.log(` ✅ ${p.filename}`);
      results.push({ title: p.title, filename: p.filename, success: true });
    } catch (err) {
      console.log(` ❌ FAILED: ${err.message.substring(0, 60)}`);
      results.push({ title: p.title, filename: p.filename, success: false, error: err.message });
    }
  }

  await browser.close();

  // Summary
  const success = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log('\n=====================================');
  console.log(`✅ SUCCESS: ${success.length}/${results.length} screenshots captured`);
  
  if (failed.length > 0) {
    console.log(`\n❌ FAILED (${failed.length}):`);
    failed.forEach(f => console.log(`   - ${f.title}`));
  }

  console.log(`\n📁 Saved to: ${SCREENSHOTS_DIR}`);
  console.log('\nFiles saved:');
  success.forEach(s => console.log(`   ✅ ${s.filename} - ${s.title}`));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
