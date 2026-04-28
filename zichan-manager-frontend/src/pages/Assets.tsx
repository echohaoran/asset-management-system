import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, DatePicker, Space, Tag, message, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import client from '../api/client';
import type { Asset, Category, AssetCreate } from '../types';

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  const [form] = Form.useForm();
  const [keyword, setKeyword] = useState('');

  const fetchAssets = async () => {
    setLoading(true);
    const params: any = {};
    if (keyword) params.keyword = keyword;
    const res = await client.get('/api/assets', { params });
    setAssets(res.data);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const res = await client.get('/api/categories');
    setCategories(res.data);
  };

  useEffect(() => {
    fetchAssets();
    fetchCategories();
  }, []);

  const openCreate = () => {
    setEditingAsset(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (asset: Asset) => {
    setEditingAsset(asset);
    form.setFieldsValue({
      ...asset,
      purchase_date: dayjs(asset.purchase_date),
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const data: AssetCreate = {
      ...values,
      purchase_date: values.purchase_date.format('YYYY-MM-DD'),
    };
    if (editingAsset) {
      await client.put(`/api/assets/${editingAsset.id}`, data);
      message.success('资产已更新');
    } else {
      await client.post('/api/assets', data);
      message.success('资产已创建');
    }
    setModalOpen(false);
    fetchAssets();
  };

  const handleCheckout = async (id: number) => {
    await client.post(`/api/assets/${id}/checkout`);
    message.success('领用成功');
    fetchAssets();
  };

  const handleReturn = async (id: number) => {
    await client.post(`/api/assets/${id}/return`);
    message.success('归还成功');
    fetchAssets();
  };

  const handleDispose = async (id: number) => {
    await client.post(`/api/assets/${id}/dispose`);
    message.success('已报废');
    fetchAssets();
  };

  const handleDelete = async (id: number) => {
    await client.delete(`/api/assets/${id}`);
    message.success('已删除');
    fetchAssets();
  };

  const showDetail = async (id: number) => {
    const res = await client.get(`/api/assets/${id}`);
    setDetailAsset(res.data);
    setDetailOpen(true);
  };

  const statusColors: Record<string, string> = { '在库': 'green', '领用中': 'blue', '已报废': 'red' };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '名称', dataIndex: 'name', key: 'name', render: (_: string, record: Asset) => <a onClick={() => showDetail(record.id)}>{_}</a> },
    { title: '分类', dataIndex: 'category_name', key: 'category_name' },
    { title: '价格', dataIndex: 'price', key: 'price', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '购买日期', dataIndex: 'purchase_date', key: 'purchase_date', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
    { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={statusColors[v]}>{v}</Tag> },
    { title: '领用人', dataIndex: 'current_user_name', key: 'current_user_name' },
    {
      title: '操作', key: 'action',
      render: (_: any, record: Asset) => (
        <Space>
          {record.status === '在库' && <Button type="link" onClick={() => handleCheckout(record.id)}>领用</Button>}
          {record.status === '领用中' && <Button type="link" onClick={() => handleReturn(record.id)}>归还</Button>}
          {record.status !== '已报废' && <Button type="link" danger onClick={() => handleDispose(record.id)}>报废</Button>}
          <Button type="link" onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Input placeholder="搜索资产名称" value={keyword} onChange={(e) => setKeyword(e.target.value)} onPressEnter={fetchAssets} prefix={<SearchOutlined />} style={{ width: 250 }} />
        <Button type="primary" onClick={fetchAssets}>搜索</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增资产</Button>
      </Space>

      <Table columns={columns} dataSource={assets} rowKey="id" loading={loading} />

      <Modal title={editingAsset ? '编辑资产' : '新增资产'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} width={600}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="资产名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category_id" label="分类" rules={[{ required: true }]}>
            <Select options={categories.map((c) => ({ label: c.name, value: c.id }))} />
          </Form.Item>
          <Form.Item name="price" label="价格">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="purchase_date" label="购买日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="资产详情" open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={700}>
        {detailAsset && (
          <div>
            <p><strong>名称：</strong>{detailAsset.name}</p>
            <p><strong>分类：</strong>{detailAsset.category_name}</p>
            <p><strong>价格：</strong>¥{detailAsset.price.toFixed(2)}</p>
            <p><strong>购买日期：</strong>{dayjs(detailAsset.purchase_date).format('YYYY-MM-DD')}</p>
            <p><strong>状态：</strong><Tag color={statusColors[detailAsset.status]}>{detailAsset.status}</Tag></p>
            <p><strong>领用人：</strong>{detailAsset.current_user_name || '-'}</p>
            <p><strong>描述：</strong>{detailAsset.description || '-'}</p>
            <h4 style={{ marginTop: 16 }}>操作日志</h4>
            <Table
              columns={[
                { title: '操作', dataIndex: 'action', key: 'action' },
                { title: '详情', dataIndex: 'detail', key: 'detail' },
                { title: '时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
              ]}
              dataSource={detailAsset.logs}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
