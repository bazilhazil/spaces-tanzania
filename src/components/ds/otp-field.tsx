import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";

type Props = {
  value: string;
  onChange: (v: string) => void;
  length?: 4 | 6;
  className?: string;
};

export function OtpField({ value, onChange, length = 6, className }: Props) {
  const half = Math.floor(length / 2);
  return (
    <InputOTP maxLength={length} value={value} onChange={onChange} containerClassName={className}>
      <InputOTPGroup>
        {Array.from({ length: half }).map((_, i) => (
          <InputOTPSlot key={i} index={i} className="h-14 w-12 rounded-xl text-lg font-semibold" />
        ))}
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        {Array.from({ length: length - half }).map((_, i) => (
          <InputOTPSlot key={i + half} index={i + half} className="h-14 w-12 rounded-xl text-lg font-semibold" />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
