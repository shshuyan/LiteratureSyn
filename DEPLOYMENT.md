# Deployment Checklist

## Pre-deployment
- [ ] All tests passing (`npm run test:ci`)
- [ ] Build succeeds (`npm run build:prod`)
- [ ] Environment variables configured
- [ ] Database migrations run (if applicable)
- [ ] External services configured (OpenAI, etc.)

## Deployment Steps
- [ ] Deploy to staging environment
- [ ] Run smoke tests on staging
- [ ] Deploy to production
- [ ] Verify production deployment
- [ ] Monitor error rates and performance

## Post-deployment
- [ ] Check application health endpoint
- [ ] Verify all major user flows work
- [ ] Monitor logs for errors
- [ ] Check performance metrics
- [ ] Update documentation

## Rollback Plan
- [ ] Keep previous deployment ready
- [ ] Database rollback plan (if needed)
- [ ] DNS rollback procedure
- [ ] Communication plan for users

## Environment Variables Required
- NODE_ENV=production
- NEXT_PUBLIC_APP_URL
- API_SECRET_KEY
- Database connection strings
- External API keys

## Performance Targets
- [ ] First Contentful Paint < 2s
- [ ] Largest Contentful Paint < 4s
- [ ] Cumulative Layout Shift < 0.1
- [ ] First Input Delay < 100ms
