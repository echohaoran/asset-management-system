import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Spin, Radio } from 'antd';
import { BankOutlined, CheckCircleOutlined, SwapOutlined, DeleteOutlined, DollarOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import client from '../api/client';
import type { DashboardStats } from '../types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC0CB', '#A0522D'];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartType, setChartType] = useState<'category' | 'department'>('category');

  useEffect(() => {
    client.get('/api/dashboard/stats').then((res) => setStats(res.data));
  }, []);

  if (!stats) return <Spin style={{ display: 'block', marginTop: 100 }} />;

  const pieData = chartType === 'category'
    ? stats.category_stats.filter((c) => c.count > 0).map((c) => ({ name: c.name, value: c.count }))
    : stats.department_stats.filter((d) => d.count > 0).map((d) => ({ name: d.name, value: d.count }));

  const ganttData = stats.category_stats
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div>
      <Row gutter={16}>
        <Col span={4}>
          <Card><Statistic title="资产总数" value={stats.total_assets} prefix={<BankOutlined />} /></Card>
        </Col>
        <Col span={4}>
          <Card><Statistic title="在库" value={stats.in_stock} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#3f8600' }} /></Card>
        </Col>
        <Col span={4}>
          <Card><Statistic title="领用中" value={stats.checked_out} prefix={<SwapOutlined />} valueStyle={{ color: '#1890ff' }} /></Card>
        </Col>
        <Col span={4}>
          <Card><Statistic title="已报废" value={stats.disposed} prefix={<DeleteOutlined />} valueStyle={{ color: '#ff4d4f' }} /></Card>
        </Col>
        <Col span={4}>
          <Card><Statistic title="总价值(元)" value={stats.total_value.toFixed(2)} prefix={<DollarOutlined />} /></Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={12}>
          <Card
            title="资产分布"
            extra={
              <Radio.Group value={chartType} onChange={(e) => setChartType(e.target.value)}>
                <Radio.Button value="category">资产类型</Radio.Button>
                <Radio.Button value="department">部门</Radio.Button>
              </Radio.Group>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="各分类资产统计（甘特图）">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                layout="vertical"
                data={ganttData}
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#1890ff" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
