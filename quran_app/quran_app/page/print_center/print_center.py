import frappe
import json
# 🌟 هنا بنستورد الدالة الصح اللي بتشغل التقارير
from frappe.desk.query_report import run as run_report

def get_context(context):
    pass

@frappe.whitelist()
def search_groups(search_text):
    if not search_text:
        return []
        
    groups = frappe.get_all("Student Group",
        or_filters=[
            ["name", "like", f"%{search_text}%"],
            ["student_group_name", "like", f"%{search_text}%"],
            ["custom_group_code", "like", f"%{search_text}%"]
        ],
        fields=["name", "student_group_name", "custom_group_code", "custom_main_instructor"],
        limit_page_length=20
    )
    return groups

@frappe.whitelist()
def get_branches():
    return frappe.get_all("Branch", fields=["name"])

@frappe.whitelist()
def get_report_print_html(report_name, filters, print_format):
    # 1. تحويل الفلاتر لو جاية كنص
    if isinstance(filters, str):
        filters = json.loads(filters)
    
    # 2. تشغيل التقرير باستخدام الدالة الصح
    report_data = run_report(report_name, filters=filters)
    
    if not report_data or not report_data.get("result"):
        return None
        
    data = report_data.get("result")
    
    # 3. جلب الـ Print Format بتاعك
    pf = frappe.get_doc("Print Format", print_format)
    
    # 4. دمج البيانات مع القالب (Jinja)
    html_content = frappe.render_template(pf.html, {
        "data": data,
        "filters": filters
    })
    
    # 5. تجهيز الـ HTML كامل عشان الطباعة
    full_html = f"""
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>طباعة الدفتر المالي</title>
    </head>
    <body>
        {html_content}
    </body>
    </html>
    """
    return full_html