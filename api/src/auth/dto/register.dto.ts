export class RegisterDto {
    email: string;
    password: string;
    fullName: string;
    role?: 'STUDENT' | 'TEACHER' | 'ADMIN';
}