# Copyright (c) 2026, RFD TechHouse and contributors
# For license information, please see license.txt

import frappe
from frappe import _

def execute(filters=None):
    columns = [
         {"label": _("الفترة"), "fieldname": "current_period", "fieldtype": "Data", "width": 0, "hidden": 1}, # حقل مخفي عشان نستخدمه في الطباعة
		{"label": _("كود الطالب"), "fieldname": "custom_student_code", "fieldtype": "Data", "width": 120},
        {"label": _("الطالب"), "fieldname": "student_name", "fieldtype": "Data", "width": 200},
        {"label": _("الحالة"), "fieldname": "custom_status", "fieldtype": "Data", "width": 100},
        {"label": _("الماضي"), "fieldname": "custom_previous_balance", "fieldtype": "Float", "width": 100},
        {"label": _("اشتراك الفترة"), "fieldname": "custom_current_period_fee", "fieldtype": "Float", "width": 120},
        {"label": _("شهر 1"), "fieldname": "month_1", "fieldtype": "Data", "width": 80},
        {"label": _("شهر 2"), "fieldname": "month_2", "fieldtype": "Data", "width": 80},
        {"label": _("شهر 3"), "fieldname": "month_3", "fieldtype": "Data", "width": 80},
        {"label": _("المجموعة"), "fieldname": "student_group_name", "fieldtype": "Data", "width": 150},
        {"label": _("المعلم/ة"), "fieldname": "custom_main_instructor", "fieldtype": "Data", "width": 150},
        {"label": _("ملاحظات"), "fieldname": "notes", "fieldtype": "Data", "width": 200},
    ]

    conditions = ""
    if filters:
        if filters.get("custom_branch"):
            conditions += " AND s.custom_branch = %(custom_branch)s"
        if filters.get("custom_student_group"):
            conditions += " AND s.custom_student_group = %(custom_student_group)s"
        if filters.get("custom_status"):
            conditions += " AND s.custom_status = %(custom_status)s"
        if filters.get("group_type") == "المجموعات الخاصة فقط":
            conditions += " AND sg.custom_is_special = 1"
        elif filters.get("group_type") == "المجموعات العادية فقط":
            conditions += " AND (sg.custom_is_special = 0 OR sg.custom_is_special IS NULL)"
        

    query = """
        SELECT 
			(SELECT value FROM `tabSingles` WHERE doctype='Quran Settings' AND field='current_period') AS current_period,
            s.custom_student_code,
            s.student_name,
            s.custom_status,
            s.custom_previous_balance,
            s.custom_current_period_fee,
            '' as month_1, '' as month_2, '' as month_3,
            IFNULL(sg.student_group_name, '') as student_group_name,
            IFNULL(sg.custom_main_instructor, '') as custom_main_instructor,
            '' as notes
        FROM 
            `tabStudent` s
        LEFT JOIN 
            `tabStudent Group` sg ON s.custom_student_group = sg.name
        WHERE 1=1 """ + conditions + """
        ORDER BY 
            s.student_name ASC
    """
    
    data = frappe.db.sql(query, filters, as_dict=1)
    
    return columns, data