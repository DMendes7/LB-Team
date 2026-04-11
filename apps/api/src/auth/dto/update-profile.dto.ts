import { Type } from "class-transformer";
import { IsDateString, IsNumber, IsOptional, IsString, Max, Min, MinLength } from "class-validator";

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  /** ISO date (YYYY-MM-DD) ou omitir para não alterar */
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(30)
  @Max(300)
  weightKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(100)
  @Max(250)
  heightCm?: number;
}
