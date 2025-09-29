
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/auth';
import type { Role } from '@/lib/types';

// 1. Define the RBAC Matrix from the backend specification
const rbacMatrix: Record<string, { methods: string[], roles: Role[] }[]> = {
    '/api/v1/users': [
        { methods: ['POST', 'GET', 'PUT'], roles: ['manager'] }
    ],
    '/api/v1/patients': [
        { methods: ['POST'], roles: ['receptionist', 'manager'] },
        { methods: ['GET'], roles: ['receptionist', 'manager', 'technician'] },
        { methods: ['PUT'], roles: ['receptionist', 'manager'] }
    ],
    '/api/v1/orders': [
        { methods: ['POST'], roles: ['receptionist', 'manager', 'physician'] },
        { methods: ['GET'], roles: ['receptionist', 'manager', 'technician', 'physician', 'patient'] }
    ],
    '/api/v1/samples/accession': [
        { methods: ['POST'], roles: ['technician', 'manager'] }
    ],
    '/api/v1/samples/.*/reject': [
        { methods: ['POST'], roles: ['technician', 'manager'] }
    ],
    '/api/v1/results/verify': [
        { methods: ['POST'], roles: ['technician', 'manager'] }
    ],
    '/api/v1/inventory': [
        { methods: ['POST', 'PUT'], roles: ['manager'] },
        { methods: ['GET'], roles: ['manager', 'technician'] }
    ],
    '/api/v1/reports/kpi': [
        { methods: ['GET'], roles: ['manager'] }
    ],
    '/api/v1/audit-logs': [
        { methods: ['GET'], roles: ['manager'] }
    ],
    '/api/v1/portal/orders/.*': [
        { methods: ['GET'], roles: ['physician', 'patient'] }
    ]
};


export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 2. Define public paths that don't require authentication
  const publicPaths = [
    '/api/v1/auth/login',
    '/api/v1/health/db-check',
  ];

  // Let the request through if it's a public path or for internal Next.js assets
  if (publicPaths.some(p => pathname.startsWith(p)) || pathname.startsWith('/_next/')) {
    return NextResponse.next();
  }
  
  // Protect all other API routes
  if (pathname.startsWith('/api')) {
    // 3. Extract and validate JWT
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return new NextResponse(JSON.stringify({ message: 'Authorization token missing.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const decryptedPayload = await decrypt(token);

    if (!decryptedPayload || !decryptedPayload.role) {
      return new NextResponse(JSON.stringify({ message: 'Invalid or expired token.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const userRole = decryptedPayload.role as Role;
    const requestMethod = request.method;

    // 4. Check user's role against the RBAC matrix
    const pathRuleKey = Object.keys(rbacMatrix).find(key => new RegExp(`^${key}$`).test(pathname));

    if (!pathRuleKey) {
        // Default to deny if no specific rule is found for an API path
        return new NextResponse(JSON.stringify({ message: 'Access denied. No rule for this endpoint.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    
    const rulesForPath = rbacMatrix[pathRuleKey];
    const ruleForMethod = rulesForPath.find(r => r.methods.includes(requestMethod));

    if (!ruleForMethod || !ruleForMethod.roles.includes(userRole)) {
        return new NextResponse(JSON.stringify({ message: 'Forbidden. You do not have permission to perform this action.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: '/:path*',
}
