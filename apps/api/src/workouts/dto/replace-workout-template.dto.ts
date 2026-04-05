import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";

/** Bloco de prescrição (séries/reps/descanso) enviado pelo editor web. */
export class PrescriptionBlockDto {
  @IsOptional()
  @IsString()
  instructions?: string;

  @IsInt()
  @Min(1)
  sets!: number;

  @IsString()
  reps!: string;

  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @IsInt()
  @Min(0)
  restSec!: number;
}

export class ExerciseReplaceDto {
  @IsString()
  exerciseId!: string;

  @IsInt()
  @Min(0)
  orderIndex!: number;

  @IsOptional()
  @IsInt()
  sets?: number;

  @IsOptional()
  @IsString()
  reps?: string;

  @IsOptional()
  @IsInt()
  restSec?: number;

  @IsOptional()
  @IsString()
  cadence?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  durationSec?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionBlockDto)
  prescriptionBlocks?: PrescriptionBlockDto[];
}

export class DayReplaceDto {
  @IsInt()
  @Min(0)
  dayIndex!: number;

  @IsString()
  name!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExerciseReplaceDto)
  exercises!: ExerciseReplaceDto[];
}

export class ReplaceWorkoutTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  description?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayReplaceDto)
  days!: DayReplaceDto[];
}
