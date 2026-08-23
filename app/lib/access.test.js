// app/lib/access.test.js
//
// Phase 2 — اليوم 25: اختبار الدالة المركزية اللي بيعتمد عليها كل قفل
// محتوى في المشروع (courses/[id]/sections, lessons/[id], [id]/lessons).
// أي باج هنا معناها تسريب محتوى مدفوع أو حرمان طالب له حق وصول فعلي —
// عشان كده الملف ده أهم اختبار في Phase 2.

import { jest } from '@jest/globals';

const mockEnrollmentFindOne = jest.fn();
const mockAuthFindById = jest.fn();
const mockPlanFindById = jest.fn();

jest.mock('@/app/lib/models', () => ({
  getEnrollmentModel: () => ({ findOne: mockEnrollmentFindOne }),
  getMembershipPlanModel: () => ({ findById: mockPlanFindById }),
}));

jest.mock('@/app/lib/mongodb', () => ({
  getAuthModel: () => ({ findById: mockAuthFindById }),
}));

const { hasActiveMembershipAccessToCourse, getCourseAccessForUser } = require('./access.js');

function leanReturn(value) {
  return { lean: () => Promise.resolve(value) };
}

describe('hasActiveMembershipAccessToCourse', () => {
  const userId = 'user1';
  const courseId = 'course1';

  it('returns false when the user has no membership at all', async () => {
    mockAuthFindById.mockReturnValue(leanReturn({ membership: null }));
    const result = await hasActiveMembershipAccessToCourse(userId, courseId);
    expect(result).toBe(false);
    expect(mockPlanFindById).not.toHaveBeenCalled();
  });

  it('returns false when membership.status is not "active"', async () => {
    mockAuthFindById.mockReturnValue(
      leanReturn({ membership: { status: 'inactive', plan: 'plan1', expiresAt: null } })
    );
    const result = await hasActiveMembershipAccessToCourse(userId, courseId);
    expect(result).toBe(false);
  });

  it('returns false when membership.expiresAt is in the past (lazy expiry)', async () => {
    mockAuthFindById.mockReturnValue(
      leanReturn({
        membership: { status: 'active', plan: 'plan1', expiresAt: new Date(Date.now() - 86400000) },
      })
    );
    const result = await hasActiveMembershipAccessToCourse(userId, courseId);
    expect(result).toBe(false);
    // 🔒 لازم يرفض قبل ما يوصل للـ plan lookup أصلاً
    expect(mockPlanFindById).not.toHaveBeenCalled();
  });

  it('returns false when the plan itself no longer exists or is deactivated', async () => {
    mockAuthFindById.mockReturnValue(
      leanReturn({ membership: { status: 'active', plan: 'plan1', expiresAt: null } })
    );
    mockPlanFindById.mockReturnValue(leanReturn(null));
    expect(await hasActiveMembershipAccessToCourse(userId, courseId)).toBe(false);

    mockPlanFindById.mockReturnValue(leanReturn({ isActive: false, allowedCourses: [] }));
    expect(await hasActiveMembershipAccessToCourse(userId, courseId)).toBe(false);
  });

  it('grants access to ANY course when allowedCourses is empty (e.g. Pro plan)', async () => {
    mockAuthFindById.mockReturnValue(
      leanReturn({ membership: { status: 'active', plan: 'plan1', expiresAt: null } })
    );
    mockPlanFindById.mockReturnValue(leanReturn({ isActive: true, allowedCourses: [] }));
    expect(await hasActiveMembershipAccessToCourse(userId, 'any-random-course')).toBe(true);
  });

  it('grants access only to courses explicitly listed in allowedCourses', async () => {
    mockAuthFindById.mockReturnValue(
      leanReturn({ membership: { status: 'active', plan: 'plan1', expiresAt: null } })
    );
    mockPlanFindById.mockReturnValue(
      leanReturn({ isActive: true, allowedCourses: [{ toString: () => 'course1' }] })
    );
    expect(await hasActiveMembershipAccessToCourse(userId, 'course1')).toBe(true);
    expect(await hasActiveMembershipAccessToCourse(userId, 'course2')).toBe(false);
  });

  it('treats a still-valid future expiresAt as active', async () => {
    mockAuthFindById.mockReturnValue(
      leanReturn({
        membership: { status: 'active', plan: 'plan1', expiresAt: new Date(Date.now() + 86400000) },
      })
    );
    mockPlanFindById.mockReturnValue(leanReturn({ isActive: true, allowedCourses: [] }));
    expect(await hasActiveMembershipAccessToCourse(userId, courseId)).toBe(true);
  });
});

describe('getCourseAccessForUser', () => {
  it('returns hasAccess=false with no userId/courseId', async () => {
    const result = await getCourseAccessForUser({ userId: null, courseId: null });
    expect(result).toEqual({
      isEnrolled: false,
      enrollment: null,
      hasMembershipAccess: false,
      hasAccess: false,
      reason: 'not_enrolled',
    });
  });

  it('hasAccess=true via explicit enrollment even with no membership', async () => {
    mockEnrollmentFindOne.mockReturnValue(leanReturn({ _id: 'enr1', status: 'active' }));
    mockAuthFindById.mockReturnValue(leanReturn({ membership: null }));

    const result = await getCourseAccessForUser({ userId: 'u1', courseId: 'c1' });
    expect(result.isEnrolled).toBe(true);
    expect(result.hasMembershipAccess).toBe(false);
    expect(result.hasAccess).toBe(true);
  });

  it('hasAccess=true via active membership even with NO explicit enrollment row', async () => {
    // 🔒 هذا أهم اختبار في الملف: عضو Pro يقدر يفتح المحتوى فورًا من غير
    // أي Enrollment صريح — نص متطلب اليوم 22 بالحرف.
    mockEnrollmentFindOne.mockReturnValue(leanReturn(null));
    mockAuthFindById.mockReturnValue(
      leanReturn({ membership: { status: 'active', plan: 'plan1', expiresAt: null } })
    );
    mockPlanFindById.mockReturnValue(leanReturn({ isActive: true, allowedCourses: [] }));

    const result = await getCourseAccessForUser({ userId: 'u1', courseId: 'c1' });
    expect(result.isEnrolled).toBe(false);
    expect(result.hasMembershipAccess).toBe(true);
    expect(result.hasAccess).toBe(true);
  });

  it('hasAccess=false when neither enrollment nor membership cover the course', async () => {
    mockEnrollmentFindOne.mockReturnValue(leanReturn(null));
    mockAuthFindById.mockReturnValue(leanReturn({ membership: null }));

    const result = await getCourseAccessForUser({ userId: 'u1', courseId: 'c1' });
    expect(result.hasAccess).toBe(false);
  });
});