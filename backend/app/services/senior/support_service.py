from app.schemas.senior import SupportResource

DEFAULT_RESOURCES = [
    SupportResource(
        id="cn-emergency-120",
        region="CN",
        resource_type="emergency",
        name="当地急救服务",
        phone="120",
        available_time="24小时",
        description="如果现在有人身安全风险，请优先联系当地急救或身边可信任的人。",
    ),
    SupportResource(
        id="cn-mental-4001619995",
        region="CN",
        resource_type="hotline",
        name="心理援助热线",
        phone="400-161-9995",
        available_time="以当地服务时间为准",
        description="适合在明显焦虑、低落或需要有人倾听时联系。",
    ),
    SupportResource(
        id="cn-health-12320",
        region="CN",
        resource_type="public_health",
        name="公共卫生服务热线",
        phone="12320",
        available_time="以当地服务时间为准",
        description="可咨询当地公共卫生和心理支持资源。",
    ),
]

def get_default_support_resources(region: str = "CN") -> list[SupportResource]:
    normalized = (region or "CN").upper()
    return [item for item in DEFAULT_RESOURCES if item.region.upper() == normalized] or DEFAULT_RESOURCES
