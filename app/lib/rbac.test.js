// app/lib/rbac.test.js
//
// 🆕 دور "موديريتور": نفس داشبورد المدرّس لكن بيشوف/يدير كورسات كل المدرّسين.
// الاختبارات دي بتثبّت الحد الفاصل بالظبط:
//   - isOwnerOrStaff (الكورسات/الدروس/الاجتماعات...): أدمن + موديريتور +
//     صاحب المورد بس.
//   - isOwnerOrAdmin (الشهادات...): لسه أدمن + صاحب المورد بس — الموديريتور
//     مايعدّيش هنا عشان مايشوفش بيانات الطلاب الشخصية.

import { jest } from '@jest/globals';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/app/lib/authOptions', () => ({ authOptions: {} }));

const { isStaffRole, isOwnerOrStaff, isOwnerOrAdmin } = require('./rbac.js');

const sessionOf = (role, id = 'u1') => ({ user: { id, role } });

describe('isStaffRole', () => {
  it('is true for admin and moderator only', () => {
    expect(isStaffRole('admin')).toBe(true);
    expect(isStaffRole('moderator')).toBe(true);
    expect(isStaffRole('teacher')).toBe(false);
    expect(isStaffRole('student')).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
  });
});

describe('isOwnerOrStaff', () => {
  it('lets a moderator manage a course owned by a different teacher', () => {
    expect(isOwnerOrStaff(sessionOf('moderator', 'mod1'), 'teacher9')).toBe(true);
  });

  it('lets an admin manage any course', () => {
    expect(isOwnerOrStaff(sessionOf('admin', 'a1'), 'teacher9')).toBe(true);
  });

  it('lets a teacher manage only their own course', () => {
    expect(isOwnerOrStaff(sessionOf('teacher', 't1'), 't1')).toBe(true);
    expect(isOwnerOrStaff(sessionOf('teacher', 't1'), 't2')).toBe(false);
  });

  it('compares ids as strings (ObjectId-like owner values)', () => {
    const objectIdLike = { toString: () => 't1' };
    expect(isOwnerOrStaff(sessionOf('teacher', 't1'), objectIdLike)).toBe(true);
  });

  it('denies students and missing sessions', () => {
    expect(isOwnerOrStaff(sessionOf('student', 's1'), 't1')).toBe(false);
    expect(isOwnerOrStaff(null, 't1')).toBe(false);
    expect(isOwnerOrStaff({}, 't1')).toBe(false);
  });
});

describe('isOwnerOrAdmin (unchanged — moderator must NOT pass)', () => {
  it('does not give a moderator access to other users\' resources', () => {
    expect(isOwnerOrAdmin(sessionOf('moderator', 'mod1'), 'student7')).toBe(false);
  });

  it('still allows admin and the owner', () => {
    expect(isOwnerOrAdmin(sessionOf('admin', 'a1'), 'student7')).toBe(true);
    expect(isOwnerOrAdmin(sessionOf('student', 'student7'), 'student7')).toBe(true);
  });
});
