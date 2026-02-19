export class ForgotPasswordDto {
  email: string;
}

export class ResetPasswordDto {
  token: string;
  newPassword: string;
}
