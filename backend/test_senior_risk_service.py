from app.services.senior.risk_service import build_rule_risk_result


def test_rule_risk_result_flags_urgent_language_for_family_contact():
    result = build_rule_risk_result("我真的不想活了，想死")

    assert result.level == "urgent"
    assert result.action.should_show_modal is True
    assert result.action.should_contact_family is True
    assert "联系" in result.action.user_message
    assert "陪" in result.action.family_message


def test_rule_risk_result_keeps_normal_chat_non_modal():
    result = build_rule_risk_result("今天吃完饭散步了一会儿，心情还可以")

    assert result.level == "normal"
    assert result.action.should_show_modal is False
    assert result.action.should_contact_family is False
