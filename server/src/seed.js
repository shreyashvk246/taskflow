import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { pathToFileURL } from 'node:url';

const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export function seed({ reset = false } = {}) {
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count > 0 && !reset) return false;

  const run = db.transaction(() => {
    if (reset) {
      db.exec('DELETE FROM activity_logs; DELETE FROM comments; DELETE FROM tasks; DELETE FROM project_members; DELETE FROM projects; DELETE FROM users; DELETE FROM sqlite_sequence;');
    }
    const insUser = db.prepare(
      'INSERT INTO users (name, email, password_hash, role, job_title, status) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const hash = (p) => bcrypt.hashSync(p, 10);
    const users = [
      ['Aarav Sharma', 'admin@taskflow.com', 'Admin@123', 'admin', 'System Administrator', 'active'],
      ['Priya Nair', 'manager@taskflow.com', 'Manager@123', 'manager', 'Project Manager', 'active'],
      ['Rohan Mehta', 'rohan@taskflow.com', 'Manager@123', 'manager', 'Engineering Lead', 'active'],
      ['Sneha Iyer', 'member@taskflow.com', 'Member@123', 'member', 'Frontend Developer', 'active'],
      ['Karan Patel', 'karan@taskflow.com', 'Member@123', 'member', 'Backend Developer', 'active'],
      ['Ananya Gupta', 'ananya@taskflow.com', 'Member@123', 'member', 'UI/UX Designer', 'active'],
      ['Vikram Singh', 'vikram@taskflow.com', 'Member@123', 'member', 'QA Engineer', 'active'],
      ['Meera Joshi', 'meera@taskflow.com', 'Member@123', 'member', 'Content Writer', 'inactive'],
    ];
    const ids = users.map((u) => insUser.run(u[0], u[1], hash(u[2]), u[3], u[4], u[5]).lastInsertRowid);
    const [admin, priya, rohan, sneha, karan, ananya, vikram] = ids;

    const insProject = db.prepare(
      'INSERT INTO projects (name, description, status, start_date, due_date, owner_id) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const insMember = db.prepare('INSERT INTO project_members (project_id, user_id) VALUES (?, ?)');
    const projects = [
      ['Website Redesign', 'Revamp the corporate website with a modern, responsive design system.', 'active', daysFromNow(-30), daysFromNow(25), priya, [sneha, ananya, vikram]],
      ['Mobile App Launch', 'Ship v1.0 of the customer mobile app on iOS and Android.', 'active', daysFromNow(-15), daysFromNow(45), rohan, [sneha, karan, vikram]],
      ['CRM Integration', 'Integrate the sales CRM with the internal billing platform.', 'planning', daysFromNow(5), daysFromNow(70), rohan, [karan]],
      ['Q3 Marketing Campaign', 'Plan and execute the Q3 multi-channel marketing campaign.', 'completed', daysFromNow(-90), daysFromNow(-10), priya, [ananya]],
      ['Security Audit', 'Internal security review and remediation of critical findings.', 'on_hold', daysFromNow(-5), daysFromNow(30), admin, [karan, vikram]],
    ];
    const pids = projects.map((p) => {
      const id = insProject.run(p[0], p[1], p[2], p[3], p[4], p[5]).lastInsertRowid;
      p[6].forEach((m) => insMember.run(id, m));
      return id;
    });

    const insTask = db.prepare(
      `INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, created_by, due_date, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const T = (pi, title, desc, status, priority, assignee, creator, due) =>
      insTask.run(pids[pi], title, desc, status, priority, assignee, creator, daysFromNow(due), status === 'done' ? new Date().toISOString() : null).lastInsertRowid;

    const t1 = T(0, 'Create design system tokens', 'Define colors, typography and spacing tokens.', 'done', 'high', ananya, priya, -12);
    T(0, 'Build responsive navigation', 'Header and mobile drawer navigation.', 'in_progress', 'high', sneha, priya, 3);
    T(0, 'Homepage hero section', 'Implement the new hero with animated illustration.', 'review', 'medium', sneha, priya, 1);
    T(0, 'Cross-browser QA pass', 'Test on Chrome, Safari, Firefox and Edge.', 'todo', 'medium', vikram, priya, 18);
    T(0, 'Write SEO meta content', 'Titles and descriptions for all public pages.', 'todo', 'low', null, priya, 20);
    const t6 = T(1, 'Set up authentication flow', 'Email + OTP login with refresh tokens.', 'in_progress', 'urgent', karan, rohan, -2);
    T(1, 'Push notification service', 'Integrate FCM/APNs for transactional notifications.', 'todo', 'high', karan, rohan, 12);
    T(1, 'Onboarding screens', 'Three-step onboarding with skip option.', 'done', 'medium', sneha, rohan, -5);
    T(1, 'Regression test suite', 'Automate smoke tests for core user flows.', 'todo', 'medium', vikram, rohan, 30);
    T(1, 'App store listing assets', 'Screenshots and descriptions for stores.', 'todo', 'low', null, rohan, 40);
    T(2, 'Map CRM data fields', 'Document field mapping between CRM and billing.', 'todo', 'high', karan, rohan, 15);
    T(2, 'Integration architecture doc', 'Draft the architecture and get sign-off.', 'in_progress', 'medium', rohan, rohan, 8);
    T(3, 'Campaign creatives', 'Banners and social assets for all channels.', 'done', 'high', ananya, priya, -20);
    T(3, 'Post-campaign report', 'Summarize KPIs and learnings.', 'done', 'medium', priya, priya, -11);
    T(4, 'Dependency vulnerability scan', 'Run SCA and triage critical CVEs.', 'review', 'urgent', karan, admin, -1);
    T(4, 'Penetration test retest', 'Verify fixes for reported findings.', 'todo', 'high', vikram, admin, 10);

    const insComment = db.prepare('INSERT INTO comments (task_id, user_id, body) VALUES (?, ?, ?)');
    insComment.run(t1, priya, 'Great work! Tokens look consistent across components.');
    insComment.run(t1, ananya, 'Thanks! Exported them to Figma as well.');
    insComment.run(t6, rohan, 'This is blocking the beta. Can we prioritize the OTP part?');
    insComment.run(t6, karan, 'On it — OTP verification is done, working on refresh tokens now.');

    const insLogAt = db.prepare(
      "INSERT INTO activity_logs (user_id, project_id, action, entity_type, entity_id, message, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))"
    );
    insLogAt.run(admin, null, 'seed', 'system', null, 'System initialized with demo data', '-30 days');
    [
      [priya, pids[0], 'create', 'project', pids[0], 'Priya Nair created project "Website Redesign"', '-29 days'],
      [rohan, pids[1], 'create', 'project', pids[1], 'Rohan Mehta created project "Mobile App Launch"', '-15 days'],
      [ananya, pids[0], 'status', 'task', t1, 'Ananya Gupta moved "Create design system tokens" to Done', '-12 days'],
      [rohan, pids[2], 'create', 'project', pids[2], 'Rohan Mehta created project "CRM Integration"', '-6 days'],
      [admin, pids[4], 'update', 'project', pids[4], 'Aarav Sharma updated project "Security Audit"', '-3 days'],
      [rohan, pids[1], 'comment', 'task', t6, 'Rohan Mehta commented on "Set up authentication flow"', '-2 days'],
      [karan, pids[1], 'comment', 'task', t6, 'Karan Patel commented on "Set up authentication flow"', '-1 days'],
      [sneha, pids[0], 'status', 'task', null, 'Sneha Iyer moved "Homepage hero section" to In Review', '-5 hours'],
      [sneha, pids[0], 'status', 'task', null, 'Sneha Iyer moved "Build responsive navigation" to In Progress', '-2 hours'],
    ].forEach((l) => insLogAt.run(...l));
  });
  run();
  return true;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed({ reset: process.argv.includes('--reset') });
  console.log('Database seeded.');
}
