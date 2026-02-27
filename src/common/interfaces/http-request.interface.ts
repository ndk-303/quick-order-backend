import { Request, Response } from 'express';

/**
 * Request object with authenticated user payload from JWT.
 * Used in protected controller endpoints decorated with @Req().
 */
export interface AuthenticatedRequest extends Request {
    user: {
        userId: string;
        role: string;
        restaurantId?: string;
    };
}

/**
 * Request object with Google OAuth user profile.
 * Used in the Google OAuth callback controller.
 */
export interface GoogleAuthRequest extends Request {
    user: GoogleUserProfile;
}

/**
 * Normalized Google user profile returned by GoogleStrategy.validate().
 */
export interface GoogleUserProfile {
    id?: string;
    email: string;
    firstName: string;
    lastName: string;
    picture?: string;
    accessToken?: string;
}

/**
 * Express Response with typed cookie methods.
 */
export type TypedResponse = Response;
