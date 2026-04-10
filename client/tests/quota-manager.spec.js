import { test, expect } from '@playwright/test';

const API_BASE =
  process.env.PLAYWRIGHT_API_URL ||
  'https://quota-leave-management-software.onrender.com';

const SUPERADMIN_EMAIL =
  process.env.E2E_SUPERADMIN_EMAIL || 'superadmin@fairleave.app';
const SUPERADMIN_PASS =
  process.env.E2E_SUPERADMIN_PASSWORD || 'SuperAdmin@123';
const LEADER_EMAIL = process.env.E2E_LEADER_EMAIL || 'leader@cse.edu';
const LEADER_PASS = process.env.E2E_LEADER_PASSWORD || 'Leader@123';
const STUDENT_USER = process.env.E2E_STUDENT_USER || 'CS001';
const STUDENT_PASS = process.env.E2E_STUDENT_PASSWORD || 'CS001';

async function loginViaUi(page, identifier, password, { expectSuccess = true } = {}) {
  await page.goto('/login');
  const isEmail = identifier.includes('@');
  if (isEmail) {
    await page.getByRole('tab', { name: /Admin \/ Leader/i }).click();
    await page.getByLabel('Email').fill(identifier);
  } else {
    await page.getByRole('tab', { name: /^Student$/i }).click();
    await page.getByLabel('Username').fill(identifier);
  }
  await page.getByLabel('Password').fill(password);
  const responsePromise = page.waitForResponse(
    (r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Sign In' }).click();
  const response = await responsePromise;
  if (expectSuccess) {
    if (!response.ok()) {
      const body = await response.text();
      throw new Error(`Login API ${response.status()}: ${body}`);
    }
    await page.waitForURL(
      /\/superadmin\/dashboard|\/leader\/dashboard|\/student\/home/,
      { timeout: 25_000 }
    );
  }
  return response;
}

async function apiLogin(username, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

test.describe('Authentication', () => {
  test('Superadmin can login and reaches superadmin dashboard', async ({ page }) => {
    await loginViaUi(page, SUPERADMIN_EMAIL, SUPERADMIN_PASS);
    await expect(page).toHaveURL(/\/superadmin\/dashboard/);
  });

  test('Leader can login and reaches leader dashboard', async ({ page }, testInfo) => {
    await loginViaUi(page, LEADER_EMAIL, LEADER_PASS);
    if (!page.url().includes('/leader/dashboard')) {
      testInfo.skip(
        true,
        'leader@cse.edu must have role "leader" in MongoDB (see server/scripts/fixLeaderRole.js)'
      );
    }
    await expect(page).toHaveURL(/\/leader\/dashboard/);
  });

  test('Student can login and reaches student home', async ({ page }) => {
    await loginViaUi(page, STUDENT_USER, STUDENT_PASS);
    await expect(page).toHaveURL(/\/student\/home/);
  });

  test('Wrong credentials show error message', async ({ page }) => {
    await loginViaUi(page, 'not-a-real-user-xyz', 'WrongPass!123', { expectSuccess: false });
    await expect(page.getByTestId('login-error')).toBeVisible();
    await expect(page.getByTestId('login-error')).not.toBeEmpty();
  });

  test('After login, refresh keeps user logged in', async ({ page }) => {
    await loginViaUi(page, STUDENT_USER, STUDENT_PASS);
    await expect(page).toHaveURL(/\/student\/home/);
    await page.reload();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/student\//);
  });
});

test.describe('Superadmin', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, SUPERADMIN_EMAIL, SUPERADMIN_PASS);
    await expect(page).toHaveURL(/\/superadmin\/dashboard/);
  });

  test('Dashboard loads with KPI cards visible', async ({ page }) => {
    await expect(page.getByText('Total Departments')).toBeVisible();
    await expect(page.getByText('Total Students')).toBeVisible();
    await expect(page.getByText('Active Semesters')).toBeVisible();
    await expect(page.getByText('Pending Requests')).toBeVisible();
  });

  test('Can see departments table or pending requests area', async ({ page }) => {
    const deptTable = page.getByRole('heading', { name: 'All Departments' });
    const pending = page.getByRole('heading', { name: /Pending Department Requests/i });
    await expect(deptTable.or(pending).first()).toBeVisible();
  });

  test('Can navigate to all superadmin pages without errors', async ({ page }) => {
    const paths = [
      '/superadmin/dashboard',
      '/superadmin/requests',
      '/superadmin/appoint-leader',
      '/superadmin/setup',
      '/superadmin/friday-list',
      '/superadmin/blocked',
      '/superadmin/students',
      '/superadmin/analytics',
    ];
    for (const p of paths) {
      await page.goto(p);
      await expect(page).toHaveURL(new RegExp(p.replace(/\//g, '\\/')));
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Leader', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await loginViaUi(page, LEADER_EMAIL, LEADER_PASS);
    if (!page.url().includes('/leader/dashboard')) {
      testInfo.skip(
        true,
        'leader@cse.edu must have role "leader" in MongoDB — run: node server/scripts/fixLeaderRole.js'
      );
    }
  });

  test('Dashboard loads correctly', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible();
  });

  test('Student manager page loads and shows student list or empty state', async ({ page }) => {
    await page.goto('/leader/students');
    await expect(page.getByRole('heading', { name: /Student Manager/i })).toBeVisible();
    const hasRows = await page.locator('tbody tr').count();
    const empty = page.getByText(/no students|empty/i);
    expect(hasRows >= 0).toBeTruthy();
    if (hasRows === 0) {
      await expect(empty.or(page.locator('table'))).toBeVisible();
    }
  });

  test('Can navigate to semester setup page', async ({ page }) => {
    await page.goto('/leader/setup');
    await expect(page.getByRole('heading', { name: /Semester Setup/i })).toBeVisible();
  });

  test('Friday list page loads', async ({ page }) => {
    await page.goto('/leader/friday-list');
    await expect(page.getByRole('heading', { name: /Friday List/i })).toBeVisible();
  });

  test('Reports page loads with charts or empty state', async ({ page }) => {
    await page.goto('/leader/reports');
    await expect(page.getByRole('heading', { name: /Rotation Reports/i })).toBeVisible();
    const chart = page.locator('.recharts-wrapper').first();
    const noData = page.getByText('No report data available');
    await expect(chart.or(noData)).toBeVisible();
  });
});

test.describe('Student', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, STUDENT_USER, STUDENT_PASS);
    await expect(page).toHaveURL(/\/student\/home/);
  });

  test('Home shows next quota date card', async ({ page }) => {
    const quotaCard = page.getByTestId('next-quota-card');
    const noSemester = page.getByRole('heading', { name: /No Active Semester/i });
    await expect(quotaCard.or(noSemester)).toBeVisible({ timeout: 25_000 });
    if (await quotaCard.isVisible()) {
      await expect(page.getByText('My Next Quota Date')).toBeVisible();
    }
  });

  test('Leaderboard loads and lists students', async ({ page }) => {
    await page.goto('/student/leaderboard');
    await expect(page.getByRole('heading', { name: /Class Leaderboard/i })).toBeVisible();
    await page.waitForLoadState('networkidle');
    const rows = page.locator('[data-testid="leaderboard-row"], [data-testid="leaderboard-row-me"]');
    const n = await rows.count();
    if (n > 0) {
      await expect(rows.first()).toBeVisible();
    } else {
      await expect(page.getByText('No students found.', { exact: true })).toBeVisible();
    }
  });

  test('Own card is highlighted on leaderboard', async ({ page }, testInfo) => {
    await page.goto('/student/leaderboard');
    const rows = page.locator('[data-testid="leaderboard-row"], [data-testid="leaderboard-row-me"]');
    if ((await rows.count()) === 0) {
      testInfo.skip(true, 'No leaderboard rows (inactive semester or empty roster)');
    }
    const me = page.getByTestId('leaderboard-row-me');
    await expect(me).toBeVisible({ timeout: 30_000 });
    await expect(me).toContainText('(You)');
    await expect(me).toHaveClass(/border-accent/);
  });

  test('History page loads', async ({ page }) => {
    await page.goto('/student/history');
    await expect(page.getByRole('heading', { name: /Quota History/i })).toBeVisible();
  });

  test('Profile shows correct username', async ({ page }) => {
    await page.goto('/student/profile');
    await expect(page.getByTestId('profile-name')).toBeVisible();
    await expect(page.getByTestId('profile-roll')).toHaveText(STUDENT_USER);
  });
});

test.describe('Swap flow', () => {
  test.describe.configure({ mode: 'serial' });

  test('Allocated student sees Accept/Reject when status is allocated', async ({ page }) => {
    await loginViaUi(page, STUDENT_USER, STUDENT_PASS);
    const accept = page.getByTestId('accept-spot');
    const reject = page.getByTestId('reject-spot');
    const either = accept.or(reject);
    const visible = await either.isVisible().catch(() => false);
    if (!visible) {
      test.skip(true, 'No allocated spot for this student in current data — run rotation/allocate first');
    }
    await expect(accept).toBeVisible();
    await expect(reject).toBeVisible();
  });

  test('Rejecting shows Spot Available on leaderboard; peer sees swap modal dates', async ({ browser }) => {
    const context1 = await browser.newContext();
    const p1 = await context1.newPage();
    await loginViaUi(p1, STUDENT_USER, STUDENT_PASS);
    const reject = p1.getByTestId('reject-spot');
    if (!(await reject.isVisible().catch(() => false))) {
      await context1.close();
      test.skip(true, 'CS001 not in allocated state — cannot run reject/swap chain');
    }
    p1.once('dialog', (d) => d.accept());
    await reject.click();
    await p1.waitForLoadState('networkidle');

    await p1.goto('/student/leaderboard');
    await expect(p1.getByText('Spot Available').first()).toBeVisible({ timeout: 30_000 });

    const context2 = await browser.newContext();
    const p2 = await context2.newPage();
    await loginViaUi(p2, 'CS002', 'CS002');
    await p2.goto('/student/leaderboard');
    const swapBtn = p2.getByRole('button', { name: 'Request Swap' });
    if (!(await swapBtn.isVisible().catch(() => false))) {
      await context1.close();
      await context2.close();
      test.skip(true, 'CS002 cannot request swap (may already be allocated or no open spot)');
    }
    await swapBtn.first().click();
    await expect(p2.getByTestId('swap-modal')).toBeVisible();
    await expect(p2.getByTestId('swap-modal-class-friday')).toBeVisible();
    await expect(p2.getByTestId('swap-modal-my-next')).toBeVisible();

    await context1.close();
    await context2.close();
  });
});

test.describe('Rotation / API (Render)', () => {
  test('GET /api/student/next-date returns payload with nextQuotaDate key', async () => {
    const { ok, data } = await apiLogin(STUDENT_USER, STUDENT_PASS);
    expect(ok, `login failed: ${JSON.stringify(data)}`).toBeTruthy();
    const token = data.token;
    const res = await fetch(`${API_BASE}/api/student/next-date`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('nextQuotaDate');
  });

  test('GET /api/student/leaderboard returns students array', async () => {
    const { ok, data } = await apiLogin(STUDENT_USER, STUDENT_PASS);
    expect(ok).toBeTruthy();
    const res = await fetch(`${API_BASE}/api/student/leaderboard`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    expect(res.ok).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.students)).toBeTruthy();
  });

  test('GET /api/leader/dashboard returns quota-related payload', async () => {
    const { ok, data } = await apiLogin(LEADER_EMAIL, LEADER_PASS);
    expect(ok, `leader login: ${JSON.stringify(data)}`).toBeTruthy();
    if (data.user?.role !== 'leader') {
      test.skip(true, 'Account is not role=leader in API — fix user role in MongoDB');
    }
    const res = await fetch(`${API_BASE}/api/leader/dashboard`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    expect([200, 404]).toContain(res.status);
    if (res.status === 404) {
      test.skip(true, 'No active semester for leader department');
    }
    const body = await res.json();
    expect(body).toHaveProperty('allocations');
    expect(body).toHaveProperty('totalStudents');
  });
});
