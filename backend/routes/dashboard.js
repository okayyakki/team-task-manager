const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');

// @route   GET /api/dashboard
// @desc    Get dashboard stats for current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Get all projects the user is a member of
    const projects = await Project.find({ 'members.user': req.user._id });
    const projectIds = projects.map(p => p._id);

    // Determine user's role in each project
    const adminProjectIds = projects
      .filter(p => p.members.find(m => m.user.toString() === req.user._id.toString() && m.role === 'Admin'))
      .map(p => p._id);

    // For admins: see all tasks in their projects; for members: only assigned tasks
    let taskFilter;
    if (adminProjectIds.length > 0) {
      taskFilter = {
        $or: [
          { project: { $in: adminProjectIds } },
          { assignedTo: req.user._id, project: { $in: projectIds } }
        ]
      };
    } else {
      taskFilter = { assignedTo: req.user._id, project: { $in: projectIds } };
    }

    const tasks = await Task.find(taskFilter)
      .populate('assignedTo', 'name email')
      .populate('project', 'name');

    const now = new Date();

    // Stats
    const totalTasks = tasks.length;
    const tasksByStatus = {
      'To Do': tasks.filter(t => t.status === 'To Do').length,
      'In Progress': tasks.filter(t => t.status === 'In Progress').length,
      'Done': tasks.filter(t => t.status === 'Done').length
    };

    const overdueTasks = tasks.filter(t =>
      t.dueDate && new Date(t.dueDate) < now && t.status !== 'Done'
    );

    // Tasks per user (for admin projects)
    const tasksPerUser = {};
    tasks.forEach(task => {
      if (task.assignedTo) {
        const userId = task.assignedTo._id.toString();
        const userName = task.assignedTo.name;
        if (!tasksPerUser[userId]) {
          tasksPerUser[userId] = { name: userName, count: 0, tasks: [] };
        }
        tasksPerUser[userId].count++;
        tasksPerUser[userId].tasks.push({
          _id: task._id,
          title: task.title,
          status: task.status,
          priority: task.priority
        });
      }
    });

    // Recent tasks (last 5)
    const recentTasks = [...tasks]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(t => ({
        _id: t._id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        project: t.project,
        assignedTo: t.assignedTo
      }));

    res.json({
      success: true,
      stats: {
        totalProjects: projects.length,
        totalTasks,
        tasksByStatus,
        overdueTasks: overdueTasks.length,
        overdueTasksList: overdueTasks.slice(0, 5).map(t => ({
          _id: t._id,
          title: t.title,
          dueDate: t.dueDate,
          project: t.project,
          priority: t.priority
        })),
        tasksPerUser: Object.values(tasksPerUser),
        recentTasks
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/dashboard/project/:projectId
// @desc    Get stats for a specific project
// @access  Private (members only)
router.get('/project/:projectId', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate('members.user', 'name email');

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const member = project.members.find(m => m.user._id.toString() === req.user._id.toString());
    if (!member) return res.status(403).json({ success: false, message: 'Access denied' });

    const tasks = await Task.find({ project: req.params.projectId })
      .populate('assignedTo', 'name email');

    const now = new Date();

    const tasksByStatus = {
      'To Do': tasks.filter(t => t.status === 'To Do').length,
      'In Progress': tasks.filter(t => t.status === 'In Progress').length,
      'Done': tasks.filter(t => t.status === 'Done').length
    };

    const tasksByPriority = {
      'Low': tasks.filter(t => t.priority === 'Low').length,
      'Medium': tasks.filter(t => t.priority === 'Medium').length,
      'High': tasks.filter(t => t.priority === 'High').length
    };

    const overdueTasks = tasks.filter(t =>
      t.dueDate && new Date(t.dueDate) < now && t.status !== 'Done'
    ).length;

    const tasksPerUser = {};
    tasks.forEach(task => {
      if (task.assignedTo) {
        const uid = task.assignedTo._id.toString();
        if (!tasksPerUser[uid]) {
          tasksPerUser[uid] = { name: task.assignedTo.name, count: 0 };
        }
        tasksPerUser[uid].count++;
      }
    });

    res.json({
      success: true,
      stats: {
        totalTasks: tasks.length,
        tasksByStatus,
        tasksByPriority,
        overdueTasks,
        tasksPerUser: Object.values(tasksPerUser),
        memberCount: project.members.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
