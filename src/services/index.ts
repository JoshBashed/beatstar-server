import { cmsService } from '@/services/cmsService.ts';
import { gameService } from '@/services/gameService.ts';
import { pingService } from '@/services/pingService.ts';
import { userService } from '@/services/userService.ts';

export const isKnownService = (
    service: string,
): service is keyof typeof SERVICES => Object.keys(SERVICES).includes(service);

export const SERVICES = {
    cmsservice: cmsService,
    gameservice: gameService,
    ping: pingService,
    userservice: userService,
} as const;
