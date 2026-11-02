import { Router, Response } from 'express';
import prisma from '../config/database.js';
import { validateBody } from '../middleware/validate.js';
import { updatePublicContentSchema } from '../validators/schemas.js';
import { authenticate, authorize, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

router.get('/home', optionalAuth, async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';

  const [totalMembers, activeMembers, upcomingMeetings, homeContent] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { status: 'APPROVED' } }),
    prisma.meeting.findMany({
      where: { meetingDate: { gte: new Date() } },
      take: 3,
      orderBy: { meetingDate: 'asc' },
      select: { id: true, title: true, location: true, meetingDate: true, meetingTime: true },
    }),
    prisma.publicContent.findUnique({ where: { slug: 'home' } }),
  ]);

  sendSuccess(res, {
    welcomeMessage: lang === 'om'
      ? 'Baga nagaan gara Afosha dhuftan'
      : 'Welcome to Afosha',
    statistics: { totalMembers, activeMembers },
    upcomingMeetings,
    content: homeContent,
  }, 'general.success', lang);
});

router.get('/about', optionalAuth, async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';

  const tabs = await prisma.publicContent.findMany({
    where: {
      slug: { in: ['about-afosha', 'mission-vision', 'heera-danbii', 'contact'] },
    },
    orderBy: { sortOrder: 'asc' },
  });

  sendSuccess(res, tabs, 'general.success', lang);
});

router.get('/content/:slug', optionalAuth, async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';

  const content = await prisma.publicContent.findUnique({
    where: { slug: String(req.params.slug) },
  });

  if (!content) {
    sendSuccess(res, null, 'general.notFound', lang, 404);
    return;
  }

  sendSuccess(res, content, 'general.success', lang);
});

router.put('/content/:slug', authenticate, authorize('ADMIN'), validateBody(updatePublicContentSchema), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { title, titleOm, content, contentOm } = req.body;

  const updated = await prisma.publicContent.upsert({
    where: { slug: String(req.params.slug) },
    create: { slug: String(req.params.slug), title, titleOm, content, contentOm: contentOm ?? content },
    update: { title, titleOm, content, contentOm },
  });

  sendSuccess(res, updated, 'general.success', lang);
});

export default router;
