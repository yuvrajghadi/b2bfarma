import { RoleName } from '../enums/role.enum';

type RoleLike = RoleName | { name?: RoleName } | string | null | undefined;
type UserLike = { role?: RoleLike } | RoleLike | null | undefined;

export const resolveRoleName = (userOrRole: UserLike): RoleName | undefined => {
  if (!userOrRole) return undefined;
  if (typeof userOrRole === 'string') return userOrRole as RoleName;

  if (typeof userOrRole === 'object') {
    if ('role' in userOrRole) {
      const role = userOrRole.role as RoleLike;
      if (!role) return undefined;
      if (typeof role === 'string') return role as RoleName;
      if (typeof role === 'object') return role.name;
    }

    const role = userOrRole as { name?: RoleName };
    return role.name;
  }

  return undefined;
};

export const isAdmin = (userOrRole?: UserLike): boolean =>
  resolveRoleName(userOrRole) === RoleName.ADMIN;

export const isBusiness = (userOrRole?: UserLike): boolean =>
  resolveRoleName(userOrRole) === RoleName.BUSINESS;
