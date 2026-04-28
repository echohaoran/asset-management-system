import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Space, message, Popconfirm, Select, Tag, List, Checkbox, Spin, AutoComplete } from 'antd';
import { PlusOutlined, LinkOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import type { Person, Department, Asset, FeishuContactDepartment, FeishuContactMember } from '../types';

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

  // 飞书通讯录
  const [feishuOpen, setFeishuOpen] = useState(false);
  const [feishuDepts, setFeishuDepts] = useState<FeishuContactDepartment[]>([]);
  const [feishuLoading, setFeishuLoading] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Record<string, { member: FeishuContactMember; deptName: string }>>({});
  const [syncing, setSyncing] = useState(false);

  // 搜索飞书用户
  const [searchResults, setSearchResults] = useState<FeishuContactMember[]>([]);
  const [searching, setSearching] = useState(false);

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

  const handleSearch = async (value: string) => {
    if (!value || value.length < 1) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await client.get<FeishuContactMember[]>('/api/feishu/search', { params: { q: value } });
      setSearchResults(res.data);
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  };

  const handleSelectFeishuUser = (open_id: string) => {
    const user = searchResults.find(u => u.open_id === open_id);
    if (user) {
      // 查找或创建对应的部门
      const deptName = user.department_name || '';
      let deptId: number | undefined;
      if (deptName) {
        const existing = departments.find(d => d.name === deptName);
        if (existing) {
          deptId = existing.id;
        }
      }
      form.setFieldsValue({ name: user.name, department_id: deptId });
    }
  };

  const openCreate = () => {
    setEditing(null);
    setSearchResults([]);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (person: Person) => {
    setEditing(person);
    setSearchResults([]);
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

  const openFeishu = async () => {
    setFeishuOpen(true);
    setFeishuLoading(true);
    setSelectedMembers({});
    setSelectedDept(null);
    try {
      const res = await client.get<{ departments: FeishuContactDepartment[] }>('/api/feishu/contacts');
      setFeishuDepts(res.data.departments || []);
    } catch (err: any) {
      message.error('获取飞书通讯录失败: ' + (err.response?.data?.detail || err.message));
    }
    setFeishuLoading(false);
  };

  const toggleMember = (member: FeishuContactMember, deptName: string) => {
    setSelectedMembers((prev) => {
      const next = { ...prev };
      if (next[member.open_id]) {
        delete next[member.open_id];
      } else {
        next[member.open_id] = { member, deptName };
      }
      return next;
    });
  };

  const handleFeishuSync = async () => {
    const members = Object.values(selectedMembers);
    if (members.length === 0) {
      message.warning('请至少选择一位成员');
      return;
    }
    setSyncing(true);
    try {
      // 获取现有部门名称映射
      const deptsRes = await client.get('/api/departments');
      const existingDepts: Record<string, Department> = {};
      for (const d of deptsRes.data) {
        existingDepts[d.name] = d;
      }

      const existingPersons: Record<string, Person> = {};
      for (const p of persons) {
        existingPersons[p.name] = p;
      }

      for (const { member: m, deptName } of members) {
        // 已存在则跳过
        if (existingPersons[m.name]) continue;

        // 找到或创建部门
        let deptId: number | undefined;
        if (deptName) {
          if (existingDepts[deptName]) {
            deptId = existingDepts[deptName].id;
          } else {
            // 创建新部门
            const dRes = await client.post('/api/departments', { name: deptName });
            existingDepts[deptName] = dRes.data;
            deptId = dRes.data.id;
          }
        }

        // 创建人员
        await client.post('/api/persons', {
          name: m.name,
          department_id: deptId || null,
        });
      }

      message.success(`成功同步 ${members.length} 位成员`);
      setFeishuOpen(false);
      fetch();
    } catch {
      message.error('同步失败');
    }
    setSyncing(false);
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
        <Button icon={<LinkOutlined />} onClick={openFeishu}>从飞书同步</Button>
      </Space>
      <Table columns={columns} dataSource={persons} rowKey="id" loading={loading} />

      <Modal title={editing ? '编辑人员' : '新增人员'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="姓名 *" rules={[{ required: true }]}>
            <AutoComplete
              options={searchResults.map(u => ({ value: u.open_id, label: `${u.name}${u.email ? ` (${u.email})` : ''}${u.department_name ? ` - ${u.department_name}` : ''}` }))}
              onSearch={handleSearch}
              onSelect={handleSelectFeishuUser}
              placeholder="输入姓名搜索飞书用户"
              loading={searching}
              style={{ width: '100%' }}
            >
              <Input />
            </AutoComplete>
          </Form.Item>
          <Form.Item name="department_id" label="部门">
            <Select allowClear placeholder="选择部门（输入姓名后自动带出）">
              {departments.map(d => (
                <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 飞书通讯录弹窗 */}
      <Modal
        title="从飞书通讯录导入人员"
        open={feishuOpen}
        onCancel={() => setFeishuOpen(false)}
        onOk={handleFeishuSync}
        confirmLoading={syncing}
        okText="同步选中成员"
        width={750}
      >
        {feishuLoading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" />
            <p style={{ marginTop: 16, color: '#86868b' }}>加载飞书通讯录...</p>
          </div>
        ) : feishuDepts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#86868b' }}>
            暂无通讯录数据
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 16, minHeight: 360 }}>
            <div style={{ width: 200, borderRight: '1px solid #f0f0f0', overflow: 'auto' }}>
              <div style={{ padding: '8px 0', fontWeight: 600, fontSize: 13, color: '#86868b' }}>
                部门列表
              </div>
              {feishuDepts.map((dept) => (
                <div
                  key={dept.name}
                  onClick={() => setSelectedDept(dept.name)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderRadius: 6,
                    background: selectedDept === dept.name ? '#e6f4ff' : 'transparent',
                    color: selectedDept === dept.name ? '#0071e3' : '#1d1d1f',
                    fontWeight: selectedDept === dept.name ? 500 : 400,
                    marginBottom: 2,
                  }}
                >
                  {dept.name} ({dept.members.length})
                </div>
              ))}
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {!selectedDept ? (
                <div style={{ padding: 48, textAlign: 'center', color: '#86868b' }}>
                  请选择左侧部门
                </div>
              ) : (() => {
                const dept = feishuDepts.find((d) => d.name === selectedDept);
                return dept && dept.members.length > 0 ? (
                  <List
                    dataSource={dept.members}
                    renderItem={(m) => (
                      <List.Item
                        key={m.open_id}
                        onClick={() => toggleMember(m, selectedDept!)}
                        style={{
                          cursor: 'pointer',
                          padding: '8px 12px',
                          borderRadius: 6,
                          background: selectedMembers[m.open_id] ? '#e6f4ff' : 'transparent',
                        }}
                      >
                        <Checkbox checked={!!selectedMembers[m.open_id]} />
                        <span style={{ marginLeft: 8, fontWeight: 500 }}>{m.name}</span>
                        {m.email && (
                          <span style={{ marginLeft: 8, color: '#86868b', fontSize: 12 }}>
                            {m.email}
                          </span>
                        )}
                      </List.Item>
                    )}
                  />
                ) : (
                  <div style={{ padding: 48, textAlign: 'center', color: '#86868b' }}>
                    该部门暂无成员
                  </div>
                );
              })()}
            </div>
          </div>
        )}
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