import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Space, message, Popconfirm, Tabs } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import type { Department, Person, Asset } from '../types';

interface DepartmentDetail {
  id: number;
  name: string;
  description: string;
  persons: Person[];
  assets: Asset[];
}

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [detail, setDetail] = useState<DepartmentDetail | null>(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const fetch = async () => {
    setLoading(true);
    const res = await client.get('/api/departments');
    setDepartments(res.data);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditing(dept);
    form.setFieldsValue(dept);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editing) {
      await client.put(`/api/departments/${editing.id}`, values);
      message.success('已更新');
    } else {
      await client.post('/api/departments', values);
      message.success('已创建');
    }
    setModalOpen(false);
    fetch();
  };

  const handleDelete = async (id: number) => {
    try {
      await client.delete(`/api/departments/${id}`);
      message.success('已删除');
      fetch();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '删除失败');
    }
  };

  const openDetail = async (dept: Department) => {
    try {
      const res = await client.get(`/api/departments/${dept.id}`);
      setDetail(res.data);
      setDetailOpen(true);
    } catch {
      message.error('获取详情失败');
    }
  };

  const goToPerson = (person: Person) => {
    navigate(`/persons?highlight=${person.id}`);
    setDetailOpen(false);
  };

  const goToAsset = (asset: Asset) => {
    navigate(`/assets?highlight=${asset.id}`);
    setDetailOpen(false);
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description', render: (v: string) => v || '-' },
    { title: '人员数', dataIndex: 'person_count', key: 'person_count' },
    { title: '资产数', dataIndex: 'asset_count', key: 'asset_count' },
    {
      title: '操作', key: 'action',
      render: (_: any, record: Department) => (
        <Space>
          <Button type="link" onClick={() => openDetail(record)}>详情</Button>
          <Button type="link" onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const personColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '姓名', dataIndex: 'name', key: 'name', render: (v: string, record: Person) => <Button type="link" onClick={() => goToPerson(record)}>{v}</Button> },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v?.slice(0, 10) },
  ];

  const assetColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '资产名称', dataIndex: 'name', key: 'name', render: (v: string, record: Asset) => <Button type="link" onClick={() => goToAsset(record)}>{v}</Button> },
    { title: '状态', dataIndex: 'status', key: 'status' },
    { title: '分类', dataIndex: 'category_name', key: 'category_name' },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增部门</Button>
      </Space>
      <Table columns={columns} dataSource={departments} rowKey="id" loading={loading} />

      <Modal title={editing ? '编辑部门' : '新增部门'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="部门名称 *" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="部门详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={700}
      >
        {detail && (
          <Tabs
            items={[
              {
                key: 'persons',
                label: `人员 (${detail.persons.length})`,
                children: (
                  <Table
                    dataSource={detail.persons}
                    rowKey="id"
                    pagination={false}
                    columns={personColumns}
                    size="small"
                  />
                ),
              },
              {
                key: 'assets',
                label: `资产 (${detail.assets.length})`,
                children: (
                  <Table
                    dataSource={detail.assets}
                    rowKey="id"
                    pagination={false}
                    columns={assetColumns}
                    size="small"
                  />
                ),
              },
            ]}
          />
        )}
      </Modal>
    </div>
  );
}