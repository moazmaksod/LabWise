
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/auth';
import type { Role } from '@/lib/types';

// 1. Define the RBAC Matrix from the backend specification
const rbacMatrix: Record<string, { methods: string[], roles: Role[] }[]> = {
    '/api/v1/auth/login': [
        { methods: ['POST'], roles: ['receptionist', 'technician', 'manager', 'physician', 'patient'] }
    ],
    '/api/v1/auth/me': [
        { methods: ['GET'], roles: ['receptionist', 'technician', 'manager', 'physician', 'patient'] }
    ],
    '/api/v1/users': [
        { methods: ['GET'], roles: ['manager', 'receptionist', 'physician'] },
        { methods: ['POST', 'PUT'], roles: ['manager'] }
    ],
    '/api/v1/users/.*': [
        { methods: ['GET', 'PUT'], roles: ['manager'] }
    ],
    '/api/v1/patients': [
        { methods: ['POST', 'PUT'], roles: ['receptionist', 'manager'] },
        // Note: Technician access is limited at the app layer per spec
        { methods: ['GET'], roles: ['receptionist', 'technician', 'manager'] }
    ],
     '/api/v1/patients/.*': [
        // Note: Technician access is limited at the app layer per spec
        { methods: ['GET'], roles: ['receptionist', 'technician', 'manager'] },
        { methods: ['PUT'], roles: ['receptionist', 'manager'] }
    ],
    '/api/v1/orders': [
        { methods: ['POST'], roles: ['receptionist', 'manager', 'physician'] },
        // Note: Technician, Physician, Patient access is limited to own/worklist at the app layer
        { methods: ['GET'], roles: ['receptionist', 'technician', 'manager', 'physician', 'patient'] }
    ],
    '/api/v1/orders/.*': [
        // Note: Physician and Patient access is limited to their own orders at the app layer
        { methods: ['GET'], roles: ['receptionist', 'technician', 'manager', 'physician', 'patient'] },
        { methods: ['PUT'], roles: ['receptionist', 'manager'] }
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
        // Note: Technician is read-only at the app layer
        { methods: ['GET'], roles: ['manager', 'technician'] }
    ],
     '/api/v1/inventory/.*': [
        { methods: ['PUT'], roles: ['manager'] }
    ],
    '/api/v1/reports/kpi': [
        { methods: ['GET'], roles: ['manager'] }
    ],
    '/api/v1/audit-logs': [
        { methods: ['GET'], roles: ['manager'] }
    ],
    '/api/v1/test-catalog': [
        { methods: ['GET'], roles: ['manager', 'receptionist', 'technician', 'physician'] },
        { methods: ['POST', 'PUT'], roles: ['manager'] }
    ],
     '/api/v1/test-catalog/.*': [
        { methods: ['GET'], roles: ['manager', 'receptionist', 'technician', 'physician'] },
        { methods: ['PUT'], roles: ['manager'] }
    ],
    '/api/v1/appointments': [
        { methods: ['GET'], roles: ['receptionist', 'manager'] }
    ],
};


export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 2. Define public paths that don't require authentication
  const publicPaths = [
    '/api/v1/auth/login',
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
