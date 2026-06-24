import { Router, type Request, type Response } from 'express';

const router = Router();

const AMAP_BASE = 'https://restapi.amap.com/v3';

// Transit route planning proxy
router.get('/api/transit', async (req: Request, res: Response) => {
  try {
    const AMAP_KEY = process.env.AMAP_WEB_KEY || '';
    const { origin, destination, city = '北京', time } = req.query;

    if (!origin || !destination) {
      res.status(400).json({ error: '缺少起点或终点参数' });
      return;
    }

    if (!AMAP_KEY) {
      res.status(500).json({ error: '高德地图API密钥未配置' });
      return;
    }

    const params = new URLSearchParams({
      key: AMAP_KEY,
      origin: origin as string,
      destination: destination as string,
      city: city as string,
      strategy: '0',
      nightflag: '0',
    });

    if (time) {
      params.set('time', time as string);
    }

    const url = `${AMAP_BASE}/direction/transit/integrated?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();

    res.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('Transit API error:', message);
    res.status(500).json({ error: '查询公交路线失败' });
  }
});

// Geocode proxy
router.get('/api/geocode', async (req: Request, res: Response) => {
  try {
    const AMAP_KEY = process.env.AMAP_WEB_KEY || '';
    const { address, city = '北京' } = req.query;

    if (!address) {
      res.status(400).json({ error: '缺少地址参数' });
      return;
    }

    if (!AMAP_KEY) {
      res.status(500).json({ error: '高德地图API密钥未配置' });
      return;
    }

    const params = new URLSearchParams({
      key: AMAP_KEY,
      address: address as string,
      city: city as string,
    });

    const url = `${AMAP_BASE}/geocode/geo?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();

    res.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('Geocode API error:', message);
    res.status(500).json({ error: '地理编码查询失败' });
  }
});

// Input tips proxy
router.get('/api/inputtips', async (req: Request, res: Response) => {
  try {
    const AMAP_KEY = process.env.AMAP_WEB_KEY || '';
    const { keywords, city = '北京' } = req.query;

    if (!keywords || (keywords as string).trim().length === 0) {
      res.status(400).json({ error: '缺少搜索关键词' });
      return;
    }

    if (!AMAP_KEY) {
      res.status(500).json({ error: '高德地图API密钥未配置' });
      return;
    }

    const params = new URLSearchParams({
      key: AMAP_KEY,
      keywords: keywords as string,
      city: city as string,
      citylimit: 'true',
    });

    const url = `${AMAP_BASE}/assistant/inputtips?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();

    res.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('Input tips API error:', message);
    res.status(500).json({ error: '搜索提示查询失败' });
  }
});

// Health check
router.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    env: process.env.COZE_PROJECT_ENV,
    timestamp: new Date().toISOString(),
  });
});

export default router;