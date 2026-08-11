import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

export const Public = () => SetMetadata('isPublic', true);

export const CurrentUser = () => (target: object, propertyKey: string, parameterIndex: number) => {
  const existing = Reflect.getMetadata('swagger/apiModelPropertiesArray', target.constructor, propertyKey) ?? [];
  // no-op: user resolved from req via guard; helper type only
  void existing;
  return target;
};
