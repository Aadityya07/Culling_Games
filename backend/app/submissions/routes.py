from app.models import GameState
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from app.middleware.role_required import role_required
from app.models import Submission, Team, Task, WeekConfig
from app.extensions import db
import cloudinary.uploader

submissions_bp = Blueprint("submissions", __name__, url_prefix="/api/submissions")




# 🔹 COORDINATOR — Verify Submission
# 🔹 COORDINATOR — Verify Submission
@submissions_bp.route("/verify/<int:submission_id>", methods=["PUT"])
@role_required("COORDINATOR")
def verify_submission(submission_id):

    data = request.get_json()
    action = data.get("action")

    submission = Submission.query.get(submission_id)

    if not submission:
        return jsonify({"error": "Submission not found"}), 404

    if submission.status != "PENDING":
        return jsonify({"error": "Submission already processed"}), 400

    coordinator_id = int(get_jwt_identity())
    team = Team.query.get(submission.team_id)

    if not team:
        return jsonify({"error": "Team not found"}), 404

    if team.coordinator_id != coordinator_id:
        return jsonify({"error": "You are not assigned to this team"}), 403

    if team.is_disqualified:
        return jsonify({"error": "Team is disqualified"}), 403

    if action == "VERIFIED":
        assigned_points = data.get("points")
        
        # ✅ Added safety check to prevent crashes if coordinator leaves points blank
        if assigned_points and str(assigned_points).strip() != "":
            try:
                submission.points_awarded = int(assigned_points)
            except ValueError:
                submission.points_awarded = 0
                
        submission.status = "VERIFIED"

    elif action == "REJECTED":
        submission.status = "REJECTED_BY_COORDINATOR"
    else:
        return jsonify({"error": "Invalid action"}), 400

    submission.verified_by = coordinator_id
    db.session.commit()

    return jsonify({
        "message": f"Submission {submission.status}"
    }), 200


# 🔹 MASTER — View Verified Submissions
@submissions_bp.route("/verified", methods=["GET"])
@role_required("MASTER")
def get_verified_submissions():
    submissions = Submission.query.filter_by(status="VERIFIED").all()

    result = [
        {
            "id": s.id,
            "team_id": s.team_id,
            "task_id": s.task_id,
            "points_awarded": s.points_awarded,  # ✅ THIS SENDS THE POINTS TO THE MASTER
            "proof_url": s.proof_url,
            "description": s.description,
            "week_number": s.week_number,
            "created_at": s.created_at
        }
        for s in submissions
    ]

    return jsonify(result), 200


# 🔹 MASTER — Approve Submission
@submissions_bp.route("/approve/<int:submission_id>", methods=["PUT"])
@role_required("MASTER")
def approve_submission(submission_id):
    submission = Submission.query.get(submission_id)

    if not submission:
        return jsonify({"error": "Submission not found"}), 404

    if submission.status != "VERIFIED":
        return jsonify({"error": "Submission must be VERIFIED first"}), 400

    team = Team.query.get(submission.team_id)
    task = Task.query.get(submission.task_id)

    if not team or not task:
        return jsonify({"error": "Invalid team or task"}), 400

    # Safety check for disqualified team
    if team.is_disqualified:
        return jsonify({
            "error": "Disqualified team cannot receive points"
        }), 403

    user_id = int(get_jwt_identity())

    # Weekly cap enforcement
    from app.models import WeekConfig

    week_config = WeekConfig.query.filter_by(
        week_number=team.week_number
    ).first()

    weekly_cap = week_config.weekly_cap if week_config else 30

   
    # Bonus task → no points
    if task.is_bonus:
        points_to_award = 0

    # Coordinator assigned custom points → use that
    elif submission.points_awarded and submission.points_awarded > 0:
        points_to_award = submission.points_awarded

    # Otherwise use task default points
    else:
        points_to_award = task.points


    if team.weekly_points >= weekly_cap:
        points_to_award = 0
        team.weekly_cap_reached = True
    else:
        remaining = weekly_cap - team.weekly_points
        if points_to_award > remaining:
            points_to_award = remaining
            team.weekly_cap_reached = True

    # Update team points
    team.weekly_points += points_to_award
    team.total_points += points_to_award

    # Update submission
    submission.status = "APPROVED"
    submission.points_awarded = points_to_award
    submission.approved_by = user_id

    db.session.commit()

    return jsonify({
        "message": "Submission APPROVED",
        "points_awarded": points_to_award
    }), 200




# 🔹 TEAM — View Own Submissions
@submissions_bp.route("/my", methods=["GET"])
@role_required("TEAM")
def get_my_submissions():
    user_id = int(get_jwt_identity())

    team = Team.query.filter_by(leader_id=user_id).first()
    if not team:
        return jsonify({"error": "No team found"}), 404

    submissions = Submission.query.filter_by(team_id=team.id).all()

    result = []
    for s in submissions:
        task = Task.query.get(s.task_id)
        
        # 🔥 THE FIX: Identify if this was a bonus task, even if it's archived now!
        is_bonus = False
        if task:
            if getattr(task, 'is_bonus', False):
                is_bonus = True
            elif getattr(task, 'category', '') and str(task.category).upper() == "BONUS":
                is_bonus = True
            elif getattr(task, 'name', '') and "bonus" in str(task.name).lower():
                is_bonus = True

        result.append({
            "id": s.id,
            "task_id": s.task_id,
            "status": s.status,
            "points_awarded": s.points_awarded,
            "week_number": s.week_number,
            "created_at": s.created_at,
            "is_bonus": is_bonus  # Sends the magic key to the frontend!
        })

    return jsonify(result), 200





# 🔹 COORDINATOR — View Pending Submissions (Full Details)
@submissions_bp.route("/pending", methods=["GET"])
@role_required("COORDINATOR")
def get_pending_submissions():

    submissions = Submission.query.filter_by(status="PENDING").all()

    result = []

    for s in submissions:

        team = Team.query.get(s.team_id)
        task = Task.query.get(s.task_id)

        result.append({
            "submission_id": s.id,

            "team": {
                "team_id": team.id,
                "team_name": team.team_name,
                "leader_id": team.leader_id
            },

            "task": {
                "task_id": task.id,
                "task_name": task.name,
                "points": task.points,
                "category": task.category
            },

            "proof": {
                "proof_url": s.proof_url,
                "proof_type": s.proof_type,
                "description": s.description
            },

            "week_number": s.week_number,

            "created_at": s.created_at,

            "status": s.status
        })

    return jsonify(result), 200



# 🔹 TEAM — Create Submission (with selective file upload)
@submissions_bp.route("/create", methods=["POST"])
@role_required("TEAM")
def create_submission():

    user_id = int(get_jwt_identity())
    state = GameState.query.first()

    if not state or not state.is_active:
        return jsonify({"error": "Game not active"}), 403

    if state.is_paused:
        return jsonify({"error": "Game is paused"}), 403

    task_id = request.form.get("task_id")
    description = request.form.get("description")

    if not task_id:
        return jsonify({"error": "Task ID required"}), 400

    team = Team.query.filter_by(leader_id=user_id).first()
    if not team:
        return jsonify({"error": "Create team first"}), 400

    if team.is_disqualified:
        return jsonify({"error": "Disqualified team cannot submit tasks"}), 403

    file_url = ""

    # 🔥 SMART "OTHER / PERSONAL" LOGIC 🔥
    if task_id == "other":
        if not description or len(description.strip()) < 10:
             return jsonify({"error": "A detailed description including your GDrive link is required for personal submissions."}), 400
             
        # Look for a system-created Personal task
        task = Task.query.filter_by(name="Personal / Custom Submission").first()
        if not task:
            task = Task(
                name="Personal / Custom Submission",
                category="PERSONAL",
                description="Team submitted a personal achievement.",
                points=0,  
                is_bonus=False,
                is_one_time=False,
                week_number=state.current_week if state else 1,
                is_active=True
            )
            db.session.add(task)
            db.session.flush() 
        
        task_id_to_use = task.id
    else:
        # Standard master-created task validation - REQUIRES CLOUDINARY FILE
        task = Task.query.filter_by(id=task_id, is_active=True).first()
        if not task:
            return jsonify({"error": "Invalid task"}), 400
            
        if "file" not in request.files or request.files["file"].filename == "":
            return jsonify({"error": "File required for official Master directives"}), 400
            
        file = request.files["file"]
        try:
            upload_result = cloudinary.uploader.upload(
                file,
                folder="culling_games_proofs",
                resource_type="auto"
            )
            file_url = upload_result["secure_url"]
        except Exception as e:
            return jsonify({"error": f"Upload failed: {str(e)}"}), 500
            
        task_id_to_use = task.id

    submission = Submission(
        team_id=team.id,
        task_id=task_id_to_use,
        proof_url=file_url,
        proof_type="FILE" if file_url else "LINK",
        description=description,
        week_number=team.week_number,
        status="PENDING"
    )

    db.session.add(submission)
    db.session.commit()

    return jsonify({
        "message": "Submission created successfully",
        "file_url": file_url
    }), 201




# 🔹 COORDINATOR — View Personal Verification History
@submissions_bp.route("/coordinator-history", methods=["GET"])
@role_required("COORDINATOR")
def get_coordinator_history():
    coordinator_id = int(get_jwt_identity())
    
    # Fetch submissions verified or rejected by this specific coordinator
    submissions = Submission.query.filter_by(verified_by=coordinator_id)\
        .order_by(Submission.created_at.desc()).all()
    
    result = []
    for s in submissions:
        team = Team.query.get(s.team_id)
        task = Task.query.get(s.task_id)
        
        result.append({
            "id": s.id,
            "team_name": team.team_name if team else "Unknown Team",
            "task_name": task.name if task else "Unknown Task",
            "points_awarded": s.points_awarded,
            "status": s.status,
            "created_at": s.created_at
        })
        
    return jsonify(result), 200