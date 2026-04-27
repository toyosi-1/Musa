/**
 * Firebase Realtime Database security-rules tests.
 *
 * These tests validate `database.rules.json` end-to-end by running the
 * rules against the Firebase Database emulator. They do NOT run during the
 * regular `npm test` / pre-commit flow because the emulator requires Java.
 *
 * To run locally:
 *   npm run test:rules:ci          # starts emulator automatically
 *   # or, if you already have emulators running:
 *   npm run test:rules
 *
 * Focus: the scenarios that would cause real-world harm if a future rules
 * edit broke them — role escalation, cross-estate reads, approval bypass,
 * and direct writes to another user's data.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { ref, get, set, update } from 'firebase/database';

// ── Fixture data ─────────────────────────────────────────────────────────

const PROJECT_ID = 'musa-rules-test';
const DB_NAME = 'musa-rules-test-db';

const ESTATE_A = 'estate-A';
const ESTATE_B = 'estate-B';

const ADMIN_UID = 'admin-1';
const ESTATE_A_ADMIN_UID = 'eadmin-A';
const ESTATE_B_ADMIN_UID = 'eadmin-B';
const RESIDENT_A_UID = 'res-A-1';
const RESIDENT_A2_UID = 'res-A-2';
const RESIDENT_B_UID = 'res-B-1';
const GUARD_UID = 'guard-1';
const HOH_UID = 'hoh-1';
const HOH_MEMBER_UID = 'hoh-member-1';
const HOUSEHOLD_ID = 'household-1';

// Skeleton user records to seed via the admin context. A record is required
// because most write rules do a `root.child('users').child(auth.uid)` lookup.
const SEED_USERS = {
  [ADMIN_UID]:         { email: 'a@m.co',  role: 'admin',        status: 'approved', createdAt: 1 },
  [ESTATE_A_ADMIN_UID]:{ email: 'ea@m.co', role: 'estate_admin', status: 'approved', createdAt: 1, estateId: ESTATE_A },
  [ESTATE_B_ADMIN_UID]:{ email: 'eb@m.co', role: 'estate_admin', status: 'approved', createdAt: 1, estateId: ESTATE_B },
  [RESIDENT_A_UID]:    { email: 'r1@m.co', role: 'resident',     status: 'approved', createdAt: 1, estateId: ESTATE_A },
  [RESIDENT_A2_UID]:   { email: 'r2@m.co', role: 'resident',     status: 'approved', createdAt: 1, estateId: ESTATE_A },
  [RESIDENT_B_UID]:    { email: 'rb@m.co', role: 'resident',     status: 'approved', createdAt: 1, estateId: ESTATE_B },
  [GUARD_UID]:         { email: 'g@m.co',  role: 'guard',        status: 'approved', createdAt: 1, estateId: ESTATE_A },
  [HOH_UID]:           { email: 'h@m.co',  role: 'resident',     status: 'approved', createdAt: 1, estateId: ESTATE_A, isHouseholdHead: true, householdId: HOUSEHOLD_ID },
  [HOH_MEMBER_UID]:    { email: 'hm@m.co', role: 'resident',     status: 'approved', createdAt: 1, estateId: ESTATE_A, householdId: HOUSEHOLD_ID },
};

const SEED_HOUSEHOLD = {
  name: 'Smith Household',
  headId: HOH_UID,
  members: { [HOH_UID]: true, [HOH_MEMBER_UID]: true },
  createdAt: 1,
};

// ── Emulator setup ───────────────────────────────────────────────────────

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const rules = readFileSync(resolve(__dirname, '../../database.rules.json'), 'utf8');
  try {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      database: {
        rules,
        host: '127.0.0.1',
        port: 9000,
      },
    });
  } catch (err) {
    throw new Error(
      `Firebase emulator not reachable on 127.0.0.1:9000. ` +
      `Run: npm run test:rules:ci (starts emulator) ` +
      `or: firebase emulators:start --only database,auth. ` +
      `Underlying error: ${(err as Error).message}`,
    );
  }
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

/** Reset the DB and reseed fixture data before every test. */
beforeEach(async () => {
  await testEnv.clearDatabase();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.database();
    await set(ref(db, 'users'), SEED_USERS);
    await set(ref(db, `households/${HOUSEHOLD_ID}`), SEED_HOUSEHOLD);
    await set(ref(db, `estates/${ESTATE_A}`), { id: ESTATE_A, name: 'A', createdAt: 1, updatedAt: 1 });
    await set(ref(db, `estates/${ESTATE_B}`), { id: ESTATE_B, name: 'B', createdAt: 1, updatedAt: 1 });
  });
});

function db(uid: string | null) {
  const ctx = uid === null
    ? testEnv.unauthenticatedContext()
    : testEnv.authenticatedContext(uid);
  return ctx.database();
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('users node', () => {
  it('unauthenticated requests are rejected', async () => {
    await assertFails(get(ref(db(null), `users/${RESIDENT_A_UID}`)));
  });

  it('a user can read their own profile', async () => {
    await assertSucceeds(get(ref(db(RESIDENT_A_UID), `users/${RESIDENT_A_UID}`)));
  });

  it('a resident cannot read another resident in the same estate', async () => {
    await assertFails(get(ref(db(RESIDENT_A_UID), `users/${RESIDENT_A2_UID}`)));
  });

  it('admin can read any user', async () => {
    await assertSucceeds(get(ref(db(ADMIN_UID), `users/${RESIDENT_B_UID}`)));
  });

  it('estate_admin can read users in their own estate', async () => {
    await assertSucceeds(get(ref(db(ESTATE_A_ADMIN_UID), `users/${RESIDENT_A_UID}`)));
  });

  it('estate_admin CANNOT read users in a different estate', async () => {
    await assertFails(get(ref(db(ESTATE_A_ADMIN_UID), `users/${RESIDENT_B_UID}`)));
  });

  it('a resident cannot escalate their own role to admin', async () => {
    await assertFails(set(ref(db(RESIDENT_A_UID), `users/${RESIDENT_A_UID}/role`), 'admin'));
  });

  it('a resident cannot change another user\'s role', async () => {
    await assertFails(set(ref(db(RESIDENT_A_UID), `users/${RESIDENT_A2_UID}/role`), 'admin'));
  });

  it('a resident cannot self-approve (status)', async () => {
    // Seed a pending version first
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await set(ref(ctx.database(), `users/${RESIDENT_A_UID}/status`), 'pending');
    });
    await assertFails(set(ref(db(RESIDENT_A_UID), `users/${RESIDENT_A_UID}/status`), 'approved'));
  });

  it('estate_admin can approve a user in their own estate', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await set(ref(ctx.database(), `users/${RESIDENT_A_UID}/status`), 'pending');
    });
    await assertSucceeds(set(ref(db(ESTATE_A_ADMIN_UID), `users/${RESIDENT_A_UID}/status`), 'approved'));
  });

  it('estate_admin CANNOT approve a user in a different estate', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await set(ref(ctx.database(), `users/${RESIDENT_B_UID}/status`), 'pending');
    });
    await assertFails(set(ref(db(ESTATE_A_ADMIN_UID), `users/${RESIDENT_B_UID}/status`), 'approved'));
  });

  it('only admin can change the `role` field', async () => {
    await assertFails(set(ref(db(ESTATE_A_ADMIN_UID), `users/${RESIDENT_A_UID}/role`), 'guard'));
    await assertSucceeds(set(ref(db(ADMIN_UID), `users/${RESIDENT_A_UID}/role`), 'guard'));
  });
});

describe('estates node', () => {
  it('any authenticated user can read estates (public metadata)', async () => {
    // Top-level .read is "true" — no auth required.
    await assertSucceeds(get(ref(db(null), `estates/${ESTATE_A}`)));
  });

  it('only admin can write estates', async () => {
    const newEstate = { id: 'new', name: 'X', createdAt: 1, updatedAt: 1 };
    await assertFails(set(ref(db(ESTATE_A_ADMIN_UID), 'estates/new'), newEstate));
    await assertFails(set(ref(db(RESIDENT_A_UID), 'estates/new'), newEstate));
    await assertSucceeds(set(ref(db(ADMIN_UID), 'estates/new'), newEstate));
  });
});

describe('households node', () => {
  it('a household head can read their own household', async () => {
    await assertSucceeds(get(ref(db(HOH_UID), `households/${HOUSEHOLD_ID}`)));
  });

  it('a member can read their household', async () => {
    await assertSucceeds(get(ref(db(HOH_MEMBER_UID), `households/${HOUSEHOLD_ID}`)));
  });

  it('a non-member resident cannot read the household', async () => {
    await assertFails(get(ref(db(RESIDENT_A_UID), `households/${HOUSEHOLD_ID}`)));
  });

  it('a guard can read any household (for guest verification)', async () => {
    await assertSucceeds(get(ref(db(GUARD_UID), `households/${HOUSEHOLD_ID}`)));
  });

  it('a non-head member cannot write the household', async () => {
    await assertFails(set(ref(db(HOH_MEMBER_UID), `households/${HOUSEHOLD_ID}/name`), 'hijacked'));
  });

  it('the household head can update their household', async () => {
    await assertSucceeds(set(ref(db(HOH_UID), `households/${HOUSEHOLD_ID}/name`), 'Smith Family'));
  });
});

describe('vendors node', () => {
  it('a resident can read vendors in their own estate', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await set(ref(ctx.database(), `vendors/${ESTATE_A}/v1`), { name: 'Plumber' });
    });
    await assertSucceeds(get(ref(db(RESIDENT_A_UID), `vendors/${ESTATE_A}`)));
  });

  it('a resident in Estate A cannot read vendors in Estate B', async () => {
    await assertFails(get(ref(db(RESIDENT_A_UID), `vendors/${ESTATE_B}`)));
  });

  it('a resident cannot add a vendor', async () => {
    await assertFails(set(ref(db(RESIDENT_A_UID), `vendors/${ESTATE_A}/v1`), { name: 'Fake' }));
  });

  it('estate_admin can add a vendor in their own estate', async () => {
    await assertSucceeds(set(ref(db(ESTATE_A_ADMIN_UID), `vendors/${ESTATE_A}/v1`), { name: 'Real' }));
  });

  it('estate_admin CANNOT add a vendor in another estate', async () => {
    await assertFails(set(ref(db(ESTATE_A_ADMIN_UID), `vendors/${ESTATE_B}/v1`), { name: 'Cross' }));
  });

  // ── Platform-wide vendor directory (__platform__) ───────────────────────
  // These tests protect the "one-stop shop" behavior: the super admin owns a
  // shared bucket, any authenticated estate user can read it, and no estate
  // admin can write to it.

  it('any resident can read the platform vendor directory', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await set(ref(ctx.database(), `vendors/__platform__/v1`), { name: 'Platform Plumber' });
    });
    await assertSucceeds(get(ref(db(RESIDENT_A_UID), `vendors/__platform__`)));
    await assertSucceeds(get(ref(db(RESIDENT_B_UID), `vendors/__platform__`)));
  });

  it('super admin can write to the platform vendor directory', async () => {
    await assertSucceeds(set(ref(db(ADMIN_UID), `vendors/__platform__/v1`), { name: 'Super Admin Vendor' }));
  });

  it('super admin can read any estate\'s vendors', async () => {
    await assertSucceeds(get(ref(db(ADMIN_UID), `vendors/${ESTATE_A}`)));
    await assertSucceeds(get(ref(db(ADMIN_UID), `vendors/${ESTATE_B}`)));
  });

  it('estate_admin CANNOT write to the platform vendor directory', async () => {
    await assertFails(set(ref(db(ESTATE_A_ADMIN_UID), `vendors/__platform__/v1`), { name: 'Hijack' }));
  });

  it('a resident CANNOT write to the platform vendor directory', async () => {
    await assertFails(set(ref(db(RESIDENT_A_UID), `vendors/__platform__/v1`), { name: 'Hijack' }));
  });
});

describe('emergencyAlerts node', () => {
  it('a resident can read alerts in their own estate', async () => {
    await assertSucceeds(get(ref(db(RESIDENT_A_UID), `emergencyAlerts/${ESTATE_A}`)));
  });

  it('a resident CANNOT read alerts in a different estate', async () => {
    await assertFails(get(ref(db(RESIDENT_A_UID), `emergencyAlerts/${ESTATE_B}`)));
  });

  it('a resident can post an alert in their own estate', async () => {
    await assertSucceeds(set(ref(db(RESIDENT_A_UID), `emergencyAlerts/${ESTATE_A}/a1`), {
      message: 'Help!',
      createdAt: Date.now(),
    }));
  });

  it('a resident CANNOT post an alert in another estate', async () => {
    await assertFails(set(ref(db(RESIDENT_A_UID), `emergencyAlerts/${ESTATE_B}/a1`), {
      message: 'Spoof',
      createdAt: Date.now(),
    }));
  });
});

describe('estateFeed node', () => {
  it('a resident can read the feed of their own estate', async () => {
    await assertSucceeds(get(ref(db(RESIDENT_A_UID), `estateFeed/${ESTATE_A}/posts`)));
  });

  it('a resident in Estate A CANNOT read the feed of Estate B', async () => {
    await assertFails(get(ref(db(RESIDENT_A_UID), `estateFeed/${ESTATE_B}/posts`)));
  });

  it('an unapproved user cannot post', async () => {
    // Temporarily mark RESIDENT_A as pending
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await set(ref(ctx.database(), `users/${RESIDENT_A_UID}/status`), 'pending');
    });
    await assertFails(set(ref(db(RESIDENT_A_UID), `estateFeed/${ESTATE_A}/posts/p1`), {
      authorId: RESIDENT_A_UID,
      text: 'Hi',
      createdAt: Date.now(),
    }));
  });

  it('an approved resident can post to their estate\'s feed', async () => {
    await assertSucceeds(set(ref(db(RESIDENT_A_UID), `estateFeed/${ESTATE_A}/posts/p1`), {
      authorId: RESIDENT_A_UID,
      text: 'Hello neighbours',
      createdAt: Date.now(),
    }));
  });

  it('a resident can like/unlike their own vote', async () => {
    // Seed a post
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await set(ref(ctx.database(), `estateFeed/${ESTATE_A}/posts/p1`), {
        authorId: RESIDENT_A2_UID, text: 'x', createdAt: 1,
      });
    });
    await assertSucceeds(set(
      ref(db(RESIDENT_A_UID), `estateFeed/${ESTATE_A}/posts/p1/likes/${RESIDENT_A_UID}`),
      true,
    ));
  });

  it('a resident CANNOT forge a like on behalf of another user', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await set(ref(ctx.database(), `estateFeed/${ESTATE_A}/posts/p1`), {
        authorId: RESIDENT_A2_UID, text: 'x', createdAt: 1,
      });
    });
    await assertFails(set(
      ref(db(RESIDENT_A_UID), `estateFeed/${ESTATE_A}/posts/p1/likes/${RESIDENT_A2_UID}`),
      true,
    ));
  });

  it('a resident cannot edit another user\'s post', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await set(ref(ctx.database(), `estateFeed/${ESTATE_A}/posts/p1`), {
        authorId: RESIDENT_A2_UID, text: 'original', createdAt: 1,
      });
    });
    await assertFails(set(
      ref(db(RESIDENT_A_UID), `estateFeed/${ESTATE_A}/posts/p1/text`),
      'hacked',
    ));
  });

  it('an admin can edit any post', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await set(ref(ctx.database(), `estateFeed/${ESTATE_A}/posts/p1`), {
        authorId: RESIDENT_A2_UID, text: 'original', createdAt: 1,
      });
    });
    await assertSucceeds(set(
      ref(db(ADMIN_UID), `estateFeed/${ESTATE_A}/posts/p1/text`),
      'moderated',
    ));
  });
});

describe('notifications node', () => {
  it('a user can read their own notifications', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await set(ref(ctx.database(), `notifications/${RESIDENT_A_UID}/n1`), { title: 'hi' });
    });
    await assertSucceeds(get(ref(db(RESIDENT_A_UID), `notifications/${RESIDENT_A_UID}`)));
  });

  it('a user CANNOT read another user\'s notifications', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await set(ref(ctx.database(), `notifications/${RESIDENT_A2_UID}/n1`), { title: 'secret' });
    });
    await assertFails(get(ref(db(RESIDENT_A_UID), `notifications/${RESIDENT_A2_UID}`)));
  });
});

describe('securityLogs node', () => {
  it('any authenticated user can write (append-only audit log)', async () => {
    await assertSucceeds(set(ref(db(RESIDENT_A_UID), 'securityLogs/log1'), {
      event: 'signin', at: Date.now(),
    }));
  });

  it('only admins can read the audit log', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await set(ref(ctx.database(), 'securityLogs/log1'), { event: 'x' });
    });
    await assertFails(get(ref(db(RESIDENT_A_UID), 'securityLogs/log1')));
    await assertSucceeds(get(ref(db(ADMIN_UID), 'securityLogs/log1')));
  });
});
