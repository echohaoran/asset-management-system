import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Spin, Table } from 'antd';
import { BankOutlined, CheckCircleOutlined, SwapOutlined, DeleteOutlined, DollarOutlined } from '@ant-design/icons';
import client from '../api/client';
import type { DashboardStats } from '../types';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    client.get('/api/dashboard/stats').then((res) => setStats(res.data));
  }, []);

  if (!stats) return <Spin style={{ display: 'block', marginTop: 100 }} />;

  const columns = [
    { title: '分类', dataIndex: 'name', key: 'name' },
    { title: '资产数量', dataIndex: 'count', key: 'count' },
  ];

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

      <Card title="各分类资产统计" style={{ marginTop: 24 }}>
        <Table columns={columns} dataSource={stats.category_stats} rowKey="name" pagination={false} />
      </Card>
    </div>
  );
}
