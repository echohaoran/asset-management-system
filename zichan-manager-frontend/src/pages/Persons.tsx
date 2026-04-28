import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Space, message, Popconfirm, Select, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import type { Person, Department, Asset } from '../types';

export default function Persons() {
  const navigate = useNavigate();
  const [persons, setPersons] = useState<Person[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [assetsModalOpen, setAssetsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [personAssets, setPersonAssets] = useState<Asset[]>([]);
  const [personAssetCount, setPersonAssetCount] = useState<Record<number, number>>({});
  const [form] = Form.useForm();

  const fetch = async () => {
    setLoading(true);
    const [personsRes, deptsRes] = await Promise.all([
      client.get('/api/persons'),
      client.get('/api/departments'),
    ]);
    setPersons(personsRes.data);
    setDepartments(deptsRes.data);

    // 获取每个人员的资产数量
    const counts: Record<number, number> = {};
    for (const person of personsRes.data) {
      try {
        const res = await client.get(`/api/persons/${person.id}/assets`);
        counts[person.id] = res.data.assets?.length || 0;
      } catch {
        counts[person.id] = 0;
      }
    }
    setPersonAssetCount(counts);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (person: Person) => {
    setEditing(person);
    form.setFieldsValue({ name: person.name, department_id: person.department_id });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editing) {
      await client.put(`/api/persons/${editing.id}`, values);
      message.success('已更新');
    } else {
      await client.post('/api/persons', values);
      message.success('已创建');
    }
    setModalOpen(false);
    fetch();
  };

  const handleDelete = async (id: number) => {
    try {
      await client.delete(`/api/persons/${id}`);
      message.success('已删除');
      fetch();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '删除失败');
    }
  };

  const viewAssets = async (person: Person) => {
    try {
      const res = await client.get(`/api/persons/${person.id}/assets`);
      setPersonAssets(res.data.assets || []);
      setAssetsModalOpen(true);
    } catch {
      message.error('获取资产列表失败');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '部门', dataIndex: 'department_name', key: 'department_name', render: (v: string) => v || '-' },
    { title: '借用资产数', key: 'asset_count', render: (_: any, record: Person) => (
      <Tag color="blue">{personAssetCount[record.id] || 0}</Tag>
    )},
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v?.slice(0, 10) },
    {
      title: '操作', key: 'action',
      render: (_: any, record: Person) => (
        <Space>
          <Button type="link" onClick={() => viewAssets(record)}>
            资产({personAssetCount[record.id] || 0})
          </Button>
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
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增人员</Button>
      </Space>
      <Table columns={columns} dataSource={persons} rowKey="id" loading={loading} />

      <Modal title={editing ? '编辑人员' : '新增人员'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="姓名 *" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="department_id" label="部门">
            <Select allowClear placeholder="选择部门">
              {departments.map(d => (
                <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="借用资产" open={assetsModalOpen} onCancel={() => setAssetsModalOpen(false)} footer={null} width={700}>
        {personAssets.length === 0 ? (
          <p>该人员未借用任何资产</p>
        ) : (
          <Table
            dataSource={personAssets}
            rowKey="id"
            pagination={false}
            columns={[
              {
                title: '资产名称',
                dataIndex: 'name',
                key: 'name',
                render: (v: string, record: Asset) => (
                  <Button type="link" onClick={() => navigate(`/assets?highlight=${record.id}`)}>
                    {v}
                  </Button>
                )
              },
              { title: '状态', dataIndex: 'status', key: 'status' },
              { title: '分类', dataIndex: 'category_name', key: 'category_name' },
            ]}
          />
        )}
      </Modal>
    </div>
  );
}