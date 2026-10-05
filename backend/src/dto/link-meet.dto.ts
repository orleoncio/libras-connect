import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength } from 'class-validator';
export class LinkMeetDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(2048)
  @Matches(
    /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}\/?(?:[?#][^\s]*)?$/i,
    {
      message:
        'Informe um link válido do Google Meet, como https://meet.google.com/abc-defg-hij',
    },
  )
  linkMeet: string;
}
export function normalizarLinkMeet(link: string): string {
  const url = new URL(link);
  return `https://meet.google.com${url.pathname.replace(/\/$/, '').toLowerCase()}`;
}
