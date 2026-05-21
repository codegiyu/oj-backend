export type PrivilegedAuditDescriptor = {
  action: 'admin.delete' | 'admin.approve' | 'admin.reject';
  resourceType: string;
  resourceId?: string;
};

export function resolvePrivilegedAdminAction(input: {
  method: string;
  routerPath: string;
  params: Record<string, string | undefined>;
}): PrivilegedAuditDescriptor | null {
  const { method, routerPath, params } = input;

  if (!routerPath.includes('/admin/')) {
    return null;
  }

  const segments = routerPath.split('/').filter(Boolean);
  const adminIndex = segments.indexOf('admin');

  if (adminIndex < 0) {
    return null;
  }

  const resourceType = segments[adminIndex + 1];

  if (!resourceType) {
    return null;
  }

  if (method === 'DELETE') {
    return {
      action: 'admin.delete',
      resourceType,
      resourceId: params.id,
    };
  }

  if (method === 'POST' && routerPath.endsWith('/approve')) {
    return {
      action: 'admin.approve',
      resourceType,
      resourceId: params.id,
    };
  }

  if (method === 'POST' && routerPath.endsWith('/reject')) {
    return {
      action: 'admin.reject',
      resourceType,
      resourceId: params.id,
    };
  }

  return null;
}
