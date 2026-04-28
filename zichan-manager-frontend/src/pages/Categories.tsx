import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Space, message, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import client from '../api/client';
import type { Category } from '../types';

export default function Categories() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form] = Form.useForm();

  const fetch = async () => {
    setLoading(true);
    const res = await client.get('/api/categories');
    setCats(res.data);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    form.setFieldsValue(cat);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editing) {
      await client.put(`/api/categories/${editing.id}`, values);
      message.success('已更新');
    } else {
      await client.post('/api/categories', values);
      message.success('已创建');
    }
    setModalOpen(false);
    fetch();
  };

  const handleDelete = async (id: number) => {
    try {
      await client.delete(`/api/categories/${id}`);
      message.success('已删除');
      fetch();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '删除失败');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { title: '资产数量', dataIndex: 'asset_count', key: 'asset_count' },
    {
      title: '操作', key: 'action',
      render: (_: any, record: Category) => (
        <Space>
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
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增分类</Button>
      </Space>
      <Table columns={columns} dataSource={cats} rowKey="id" loading={loading} />

      <Modal title={editing ? '编辑分类' : '新增分类'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="分类名称 *" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
