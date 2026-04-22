import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('AppModule', () => {
  it('bootstraps', async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    expect(mod).toBeDefined();
    await mod.close();
  });
});
