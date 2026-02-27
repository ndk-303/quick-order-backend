import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { GoogleUserProfile } from 'src/common/interfaces/http-request.interface';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(private configService: ConfigService) {
        super({
            clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
            clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
            callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3000/api/auth/google/callback',
            scope: ['email', 'profile'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: VerifyCallback,
    ): Promise<void> {
        try {
            const { name, emails, photos } = profile;

            // Validate required fields
            if (!emails || emails.length === 0) {
                done(new Error('No email found in Google profile'), false);
                return;
            }

            const user: GoogleUserProfile = {
                email: emails[0].value,
                firstName: name?.givenName || '',
                lastName: name?.familyName || '',
                picture: photos && photos.length > 0 ? photos[0].value : '',
                accessToken,
            };

            done(null, user);
        } catch (error) {
            done(error as Error, false);
        }
    }
}
