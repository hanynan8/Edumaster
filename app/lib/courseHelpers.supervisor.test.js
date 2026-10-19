// app/lib/courseHelpers.supervisor.test.js
//
// 🆕 resolveSupervisingTeacher: الموديريتور بيختار "المدرّس المشرف" على الكورس.
// لازم نضمن إن الكورس مايتسجلش أبدًا باسم مستخدم مش مدرّس (طالب/أدمن)، أو
// حساب موقوف، أو id غير صالح/مش موجود.

import { jest } from '@jest/globals';

const mockFindById = jest.fn();

jest.mock('@/app/lib/mongodb', () => ({
  getAuthModel: () => ({ findById: mockFindById }),
}));
jest.mock('@/app/lib/models/Lesson', () => ({ getLessonModel: jest.fn() }));
jest.mock('@/app/lib/models/Course', () => ({
  getCourseModel: jest.fn(),
  SUPPORTED_COURSE_LANGS: ['ar', 'en', 'es'],
}));

const { resolveSupervisingTeacher } = require('./courseHelpers.js');

const VALID_ID = '507f1f77bcf86cd799439011';
const leanReturn = (value) => ({ lean: () => Promise.resolve(value) });

describe('resolveSupervisingTeacher', () => {
  it('rejects a missing or malformed id without hitting the database', async () => {
    expect(await resolveSupervisingTeacher(undefined)).toEqual({ ok: false, error: 'invalid_teacher' });
    expect(await resolveSupervisingTeacher('not-an-id')).toEqual({ ok: false, error: 'invalid_teacher' });
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('returns teacher_not_found when no such user exists', async () => {
    mockFindById.mockReturnValue(leanReturn(null));
    expect(await resolveSupervisingTeacher(VALID_ID)).toEqual({ ok: false, error: 'teacher_not_found' });
  });

  it('rejects users whose role is not teacher (student/admin/moderator)', async () => {
    for (const role of ['student', 'admin', 'moderator']) {
      mockFindById.mockReturnValue(leanReturn({ _id: VALID_ID, name: 'X', role, status: 'active' }));
      expect(await resolveSupervisingTeacher(VALID_ID)).toEqual({ ok: false, error: 'user_is_not_teacher' });
    }
  });

  it('rejects a suspended teacher', async () => {
    mockFindById.mockReturnValue(leanReturn({ _id: VALID_ID, name: 'T', role: 'teacher', status: 'suspended' }));
    expect(await resolveSupervisingTeacher(VALID_ID)).toEqual({ ok: false, error: 'teacher_suspended' });
  });

  it('accepts an active teacher (and legacy accounts with no status field)', async () => {
    mockFindById.mockReturnValue(leanReturn({ _id: VALID_ID, name: 'Teacher One', role: 'teacher', status: 'active' }));
    expect(await resolveSupervisingTeacher(VALID_ID)).toEqual({
      ok: true,
      teacher: { id: VALID_ID, name: 'Teacher One' },
    });

    mockFindById.mockReturnValue(leanReturn({ _id: VALID_ID, name: 'Old Teacher', role: 'teacher' }));
    const legacy = await resolveSupervisingTeacher(VALID_ID);
    expect(legacy.ok).toBe(true);
  });
});
