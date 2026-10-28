frappe.query_reports["Financial Data Book"] = {
    "filters": [
        {
            "fieldname": "custom_branch",
            "label": __("الفرع"),
            "fieldtype": "Link",
            "options": "Branch",
            "on_change": function() {
                // لو اختار فرع، نصفر المجموعة عشان منلبسش
                if (frappe.query_report.get_filter_value('custom_branch')) {
                    frappe.query_report.set_filter_value('custom_student_group', '');
                }
            }
        },
        {
            "fieldname": "custom_student_group",
            "label": __("المجموعة"),
            "fieldtype": "Link",
            "options": "Student Group",
            "on_change": function() {
                let group = frappe.query_report.get_filter_value('custom_student_group');
                if (group) {
                    // بنجيب الفرع بتاع المجموعة دي ونحطه في فلتر الفرع
                    frappe.db.get_value("Student Group", group, "custom_branch").then(r => {
                        if (r.message && r.message.custom_branch) {
                            frappe.query_report.set_filter_value('custom_branch', r.message.custom_branch);
                        }
                    });
                }
            }
        },
        {
            "fieldname": "custom_status",
            "label": __("حالة الطالب"),
            "fieldtype": "Select",
            "options": "\nموجود\nمفصول", // لو سيبتها فاضية يجيب الكل
            "default": ""
        },
                {
            "fieldname": "group_type",
            "label": __("نوع المجموعة"),
            "fieldtype": "Select",
            "options": "\nالكل\nالمجموعات العادية فقط\nالمجموعات الخاصة فقط",
            "default": ""
        }
    ]
};