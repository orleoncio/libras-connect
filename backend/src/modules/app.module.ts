import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from '../controller/app.controller.js';
import { AppService } from '../service/app.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { databaseOptions, validateEnvironment } from '../database/config.js';
import { HorarioProfessorModule } from './horario-professor.module.js';
import { PlataformaModule } from './plataforma.module.js';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        databaseOptions({
          DB_HOST: config.getOrThrow('DB_HOST'),
          DB_PORT: config.getOrThrow('DB_PORT'),
          DB_USER: config.getOrThrow('DB_USER'),
          DB_PASSWORD: config.getOrThrow('DB_PASSWORD'),
          DB_NAME: config.getOrThrow('DB_NAME'),
        }),
    }),
    AuthModule,
    HorarioProfessorModule,
    PlataformaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
