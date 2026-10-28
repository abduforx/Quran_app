import frappe
import json

def get_context(context):
    pass

@frappe.whitelist()
def get_all_groups():

    return frappe.get_all("Student Group", fields=["name", "student_group_name", "custom_group_code"])


@frappe.whitelist()
def search_students(search_text=None, group_search=None):
    filters = {}
    or_filters = []
    found_groups = []

    # 1. البحث بالطالب (الاسم أو الكود)
    if search_text:
        or_filters = [
            ["name", "like", f"%{search_text}%"],
            ["student_name", "like", f"%{search_text}%"],
            ["custom_student_code", "like", f"%{search_text}%"]
        ]

    # 2. البحث بالمجموعة (الاسم أو الكود)
    if group_search:
        groups = frappe.get_all("Student Group", 
            or_filters=[
                ["name", "like", f"%{group_search}%"],
                ["student_group_name", "like", f"%{group_search}%"],
                ["custom_group_code", "like", f"%{group_search}%"]
            ],
            fields=["name", "student_group_name"],
        )
        if groups:
            group_names = [g.name for g in groups]
            filters["custom_student_group"] = ["in", group_names]
            found_groups = [g.student_group_name for g in groups] # بنحفظ الأسماء عشان نعرضها
        else:
            return {"students": [], "found_groups": []}

    # لو مفيش أي حاجة متكتوبة، نرجع فاضي
    if not search_text and not group_search:
        return {"students": [], "found_groups": []}

    students = frappe.get_all("Student",
        filters=filters,
        or_filters=or_filters if search_text else None,
        fields=["name", "student_name", "custom_student_code", "custom_student_group", "custom_status"],
        limit_page_length=50
    )
    
    return {"students": students, "found_groups": found_groups}



@frappe.whitelist()
def apply_changes(students, new_group=None, new_status=None, update_finance=0):
    if isinstance(students, str):
        students = json.loads(students)
        
    if not students:
        frappe.throw("لم يتم تحديد أي طلاب.")

    updated_count = 0
    for student_name in students:
        student = frappe.get_doc("Student", student_name)
        
        # 1. تغيير الحالة
        if new_status:
            student.custom_status = new_status
            if new_status == "مفصول":
                student.custom_student_group = None
        
        # 2. تغيير المجموعة
        if new_group:
            if student.custom_status == "مفصول" and not new_status:
                student.custom_status = "موجود"
            # 🌟 التحقق من الفرع
            group_branch = frappe.db.get_value("Student Group", new_group, "custom_branch")
            if student.custom_branch != group_branch:
                frappe.throw(f"الطالب ({student.student_name}) في فرع ({student.custom_branch}) ولا يمكن نقله لمجموعة في فرع ({group_branch}).")
            # -------------------
            student.custom_student_group = new_group
            
        # 3. التحقق النهائي
        if student.custom_status == "موجود" and not student.custom_student_group:
            frappe.throw(f"الطالب {student.student_name} ليس لديه مجموعة.")

        # 🌟 4. تحديث الرصيد المالي لو المستخدم طلب كده
        if int(update_finance) == 1 and student.custom_student_group:
            # بنجيب قيمة الاشتراك من المجموعة الجديدة
            group_fee = frappe.db.get_value("Student Group", student.custom_student_group, "custom_group_fees") or 0
            
            student.custom_current_period_fee = group_fee
            student.custom_current_remaining = group_fee
            
            # بنحدث الإجمالي (السابق + الجديد)
            prev = student.custom_previous_balance or 0
            student.custom_total_remaining = prev + group_fee
            
            # لو عايزين نظبط الفترة الحالية برضه
            current_p = frappe.db.get_single_value("Quran Settings", "current_period")
            if current_p:
                student.current_period = current_p

        student.save(ignore_permissions=True)
        updated_count += 1
        
    return updated_count