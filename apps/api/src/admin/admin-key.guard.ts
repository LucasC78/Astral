import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class AdminKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & any>();

    const adminKey = process.env.ADMIN_KEY?.trim();
    // Si pas de clé configurée, on bloque quand même (sécurité par défaut)
    if (!adminKey) {
      throw new ForbiddenException('ADMIN_KEY not configured');
    }

    // On accepte: header X-Admin-Key (recommandé) ou query ?key= (fallback)
    const headerKey =
      (req.headers?.['x-admin-key'] as string | undefined) ||
      (req.headers?.['X-Admin-Key'] as string | undefined);

    const queryKey = (req.query?.key as string | undefined) || undefined;

    const provided = (headerKey || queryKey || '').trim();

    if (!provided || provided !== adminKey) {
      throw new ForbiddenException('Invalid admin key');
    }

    return true;
  }
}
