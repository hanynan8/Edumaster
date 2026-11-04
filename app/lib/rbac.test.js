// app/lib/rbac.test.js
//
// 🆕 دور "موديريتور": نفس داشبورد المدرّس لكن بيشوف/يدير كورسات كل المدرّسين.
// الاختبارات دي بتثبّت الحد الفاصل بالظبط:
//   - canManageCourse (تعديل/حذف الكورسات/الدروس/الكويزات...): أدمن + موديريتور
//     بس. المدرّس (حتى المشرف على الكورس) ممنوع تمامًا.
//   - canViewCoursePerformance: أدمن + موديريتور + المدرّس المشرف على الكورس ده
//     بس (قراءة فقط).
//   - isMeetingRoomHost: أي مدرّس = أدمن جوه غرفة الميتنج (Daily owner token).
//   - isOwnerOrAdmin (الشهادات...): لسه أدمن + صاحب المورد بس — الموديريتور
//     مايعدّيش هنا عشان مايشوفش بيانات الطلاب الشخصية.

import { jest } from '@jest/globals';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/app/lib/authOptions', () => ({ authOptions: {} }));

const {
  isStaffRole,
  canManageCourse,
  canViewCoursePerformance,
  canViewCourseDetails,
  canGradeCourse,
  canHandleCourseMessages,
  isMeetingRoomHost,
  isOwnerOrAdmin,
} = require('./rbac.js');

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

describe('canManageCourse', () => {
  it('lets a moderator manage a course owned by a different teacher', () => {
    expect(canManageCourse(sessionOf('moderator', 'mod1'), 'teacher9')).toBe(true);
  });

  it('lets an admin manage any course', () => {
    expect(canManageCourse(sessionOf('admin', 'a1'), 'teacher9')).toBe(true);
  });

  it('never lets a teacher manage a course — even the supervising teacher', () => {
    expect(canManageCourse(sessionOf('teacher', 't1'), 't1')).toBe(false);
    expect(canManageCourse(sessionOf('teacher', 't1'), 't2')).toBe(false);
    expect(canManageCourse(sessionOf('teacher', 't1'), { toString: () => 't1' })).toBe(false);
  });

  it('denies students and missing sessions', () => {
    expect(canManageCourse(sessionOf('student', 's1'), 't1')).toBe(false);
    expect(canManageCourse(null, 't1')).toBe(false);
    expect(canManageCourse({}, 't1')).toBe(false);
  });
});

describe('canViewCoursePerformance / canViewCourseDetails', () => {
  it('lets the supervising teacher view (read-only) — and only for their own course', () => {
    expect(canViewCoursePerformance(sessionOf('teacher', 't1'), 't1')).toBe(true);
    expect(canViewCoursePerformance(sessionOf('teacher', 't1'), 't2')).toBe(false);
    expect(canViewCourseDetails(sessionOf('teacher', 't1'), { toString: () => 't1' })).toBe(true);
  });

  it('lets admin and moderator view any course', () => {
    expect(canViewCoursePerformance(sessionOf('admin', 'a1'), 't9')).toBe(true);
    expect(canViewCoursePerformance(sessionOf('moderator', 'm1'), 't9')).toBe(true);
  });

  it('denies students and missing sessions', () => {
    expect(canViewCoursePerformance(sessionOf('student', 's1'), 's1')).toBe(false);
    expect(canViewCoursePerformance(null, 't1')).toBe(false);
  });
});

describe('canGradeCourse / canHandleCourseMessages', () => {
  it('lets the supervising teacher grade and message — only on their own course', () => {
    expect(canGradeCourse(sessionOf('teacher', 't1'), 't1')).toBe(true);
    expect(canGradeCourse(sessionOf('teacher', 't1'), 't2')).toBe(false);
    expect(canHandleCourseMessages(sessionOf('teacher', 't1'), 't1')).toBe(true);
    expect(canHandleCourseMessages(sessionOf('teacher', 't1'), 't2')).toBe(false);
  });

  it('lets staff grade/message any course, denies students', () => {
    expect(canGradeCourse(sessionOf('admin', 'a1'), 't9')).toBe(true);
    expect(canHandleCourseMessages(sessionOf('moderator', 'm1'), 't9')).toBe(true);
    expect(canGradeCourse(sessionOf('student', 's1'), 's1')).toBe(false);
    expect(canGradeCourse(null, 't1')).toBe(false);
  });

  it('still never lets a teacher manage (edit) the course', () => {
    expect(canManageCourse(sessionOf('teacher', 't1'), 't1')).toBe(false);
  });
});

describe('isMeetingRoomHost', () => {
  it('makes teachers (and staff) admins inside the meeting room', () => {
    expect(isMeetingRoomHost(sessionOf('teacher', 't1'))).toBe(true);
    expect(isMeetingRoomHost(sessionOf('moderator', 'm1'))).toBe(true);
    expect(isMeetingRoomHost(sessionOf('admin', 'a1'))).toBe(true);
  });

  it('keeps students as regular participants', () => {
    expect(isMeetingRoomHost(sessionOf('student', 's1'))).toBe(false);
    expect(isMeetingRoomHost(null)).toBe(false);
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

describe("isMeetingStaff — الميتنجس للأدمن والموديريتور بس", () => {
  const { isMeetingStaff } = require("./rbac");
  it("أدمن وموديريتور → true", () => {
    expect(isMeetingStaff({ user: { role: "admin" } })).toBe(true);
    expect(isMeetingStaff({ user: { role: "moderator" } })).toBe(true);
  });
  it("المدرّس (حتى لو صاحب الكورس) والطالب وغير المسجّل → false", () => {
    expect(isMeetingStaff({ user: { role: "teacher", id: "t1" } })).toBe(false);
    expect(isMeetingStaff({ user: { role: "student" } })).toBe(false);
    expect(isMeetingStaff(null)).toBe(false);
  });
});
