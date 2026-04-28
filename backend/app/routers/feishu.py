import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx

from app.database import get_db
from app.models import User
from app.schemas import (
    FeishuLoginRequest,
    FeishuTokenResponse,
    FeishuUserOut,
    FeishuContactsResponse,
    FeishuContactDepartment,
    FeishuContactMember,
)
from app.auth import create_access_token, get_current_user

router = APIRouter(prefix="/api/feishu", tags=["feishu"])

FEISHU_APP_ID = "cli_a96af4517eb99bb5"
FEISHU_APP_SECRET = "el81wzxrWcWvuVML5qrPGeOqNA0fp4R5"

FEISHU_BASE = "https://open.feishu.cn/open-apis"


def _get_app_access_token() -> str:
    """获取飞书 app_access_token"""
    resp = httpx.post(
        f"{FEISHU_BASE}/auth/v3/app_access_token/internal",
        json={"app_id": FEISHU_APP_ID, "app_secret": FEISHU_APP_SECRET},
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != 0:
        raise HTTPException(status_code=500, detail=f"飞书 Token 获取失败: {data.get('msg')}")
    return data["app_access_token"]


@router.post("/login", response_model=FeishuTokenResponse)
def feishu_login(req: FeishuLoginRequest, db: Session = Depends(get_db)):
    """飞书 OAuth 登录：用 code 换取用户信息，返回 JWT token"""
    app_token = _get_app_access_token()

    # 用 code 换取 user_access_token
    resp = httpx.post(
        f"{FEISHU_BASE}/authen/v1/access_token",
        headers={"Authorization": f"Bearer {app_token}"},
        json={
            "grant_type": "authorization_code",
            "code": req.code,
        },
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != 0:
        raise HTTPException(status_code=400, detail=f"飞书授权失败: {data.get('msg')}")

    user_access_token = data["data"]["access_token"]

    # 获取用户信息
    resp = httpx.get(
        f"{FEISHU_BASE}/authen/v1/user_info",
        headers={"Authorization": f"Bearer {user_access_token}"},
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != 0:
        raise HTTPException(status_code=400, detail=f"飞书用户信息获取失败: {data.get('msg')}")

    feishu_user = data["data"]
    feishu_id = feishu_user["open_id"]
    name = feishu_user.get("name", "飞书用户")
    email = feishu_user.get("email", "")
    avatar = feishu_user.get("avatar_url", "")

    # 查找或创建用户
    user = db.query(User).filter(User.feishu_id == feishu_id).first()
    if user:
        user.email = email
        user.avatar = avatar
    else:
        # 创建新用户，username使用飞书名称；若重名则追加后缀
        base_username = name
        username = base_username
        suffix = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}{suffix}"
            suffix += 1

        user = User(
            username=username,
            feishu_id=feishu_id,
            email=email,
            avatar=avatar,
            role="user",
        )
        db.add(user)

    db.commit()
    db.refresh(user)

    # 生成 JWT token
    token = create_access_token({"sub": user.username})

    return FeishuTokenResponse(
        access_token=token,
        user=FeishuUserOut(
            id=user.id,
            username=user.username,
            role=user.role,
            email=user.email,
            avatar=user.avatar,
            created_at=user.created_at,
        ),
    )


@router.get("/search", response_model=list[FeishuContactMember])
def search_feishu_users(q: str, user: User = Depends(get_current_user)):
    """搜索飞书用户 by name or email"""
    app_token = _get_app_access_token()

    results = []

    # 遍历部门获取用户列表进行搜索
    try:
        resp = httpx.get(
            f"{FEISHU_BASE}/contact/v3/departments",
            headers={"Authorization": f"Bearer {app_token}"},
            params={
                "department_id_type": "open_department_id",
                "user_id_type": "open_id",
                "page_size": 50,
            },
        )
        data = resp.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=500, detail=f"飞书API错误: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"请求飞书失败: {str(e)}")

    if data.get("code") != 0:
        raise HTTPException(status_code=500, detail=f"飞书搜索失败: {data.get('msg')}")

    items = data.get("data", {}).get("items", [])

    for dept in items:
        dept_id = dept.get("open_department_id")
        dept_name = dept.get("name", "")
        try:
            resp = httpx.get(
                f"{FEISHU_BASE}/contact/v3/users/find_by_department",
                headers={"Authorization": f"Bearer {app_token}"},
                params={
                    "department_id": dept_id,
                    "department_id_type": "open_department_id",
                    "user_id_type": "open_id",
                    "page_size": 50,
                },
            )
            user_data = resp.json()
            if user_data.get("code") == 0:
                for u in user_data.get("data", {}).get("items", []):
                    name = u.get("name", "")
                    email = u.get("email") or ""
                    if q.lower() in name.lower() or q.lower() in email.lower():
                        results.append(FeishuContactMember(
                            name=name,
                            email=email,
                            avatar=u.get("avatar_url"),
                            open_id=u.get("open_id", ""),
                            department_id=dept_id,
                            department_name=dept_name,
                        ))
        except Exception:
            pass

    return results


@router.get("/contacts", response_model=FeishuContactsResponse)
def feishu_contacts(user: User = Depends(get_current_user)):
    """获取飞书企业通讯录（部门及人员）"""
    app_token = _get_app_access_token()

    # 获取部门列表
    try:
        resp = httpx.get(
            f"{FEISHU_BASE}/contact/v3/departments",
            headers={"Authorization": f"Bearer {app_token}"},
            params={
                "department_id_type": "open_department_id",
                "user_id_type": "open_id",
                "page_size": 50,
            },
        )
        data = resp.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=500, detail=f"飞书API错误: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"请求飞书失败: {str(e)}")

    if data.get("code") != 0:
        raise HTTPException(status_code=500, detail=f"飞书通讯录获取失败: code={data.get('code')}, msg={data.get('msg')}")

    departments = []
    items = data.get("data", {}).get("items", [])

    for dept in items:
        dept_id = dept["open_department_id"]
        dept_name = dept.get("name", "未命名部门")

        # 获取该部门的成员
        members = []
        try:
            resp = httpx.get(
                f"{FEISHU_BASE}/contact/v3/users/find_by_department",
                headers={"Authorization": f"Bearer {app_token}"},
                params={
                    "department_id": dept_id,
                    "department_id_type": "open_department_id",
                    "user_id_type": "open_id",
                    "page_size": 50,
                },
            )
            user_data = resp.json()
            if user_data.get("code") == 0:
                for u in user_data.get("data", {}).get("items", []):
                    members.append(FeishuContactMember(
                        name=u.get("name", ""),
                        email=u.get("email"),
                        avatar=u.get("avatar_url"),
                        open_id=u.get("open_id", ""),
                    ))
        except Exception:
            pass  # 跳过无法获取成员的部门

        departments.append(FeishuContactDepartment(
            name=dept_name,
            members=members,
        ))

    return FeishuContactsResponse(departments=departments)
