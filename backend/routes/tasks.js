const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');

// Helper: check if user is member of a project
const getMemberRole = (project, userId) => {
  const member = project.members.find(m => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

// @route   GET /api/tasks/project/:projectId
// @desc    Get all tasks for a project
// @access  Private (members only)
router.get('/project/:projectId', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const role = getMemberRole(project, req.user._id);
    if (!role) return res.status(403).json({ success: false, message: 'Access denied' });

    const { status, priority, assignedTo } = req.query;
    const filter = { project: req.params.projectId };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;

    // Members can only see their own tasks
    if (role === 'Member') {
      filter.assignedTo = req.user._id;
    }

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, tasks, userRole: role });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private (Admin only)
router.post('/', protect, [
  body('title').trim().isLength({ min: 2 }).withMessage('Title must be at least 2 characters'),
  body('project').notEmpty().withMessage('Project ID is required'),
  body('status').optional().isIn(['To Do', 'In Progress', 'Done']).withMessage('Invalid status'),
  body('priority').optional().isIn(['Low', 'Medium', 'High']).withMessage('Invalid priority'),
  body('dueDate').optional().isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const project = await Project.findById(req.body.project);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const role = getMemberRole(project, req.user._id);
    if (!role) return res.status(403).json({ success: false, message: 'Access denied' });
    if (role !== 'Admin') return res.status(403).json({ success: false, message: 'Only Admins can create tasks' });

    // Validate assignedTo is a project member
    if (req.body.assignedTo) {
      const isMember = project.members.some(
        m => m.user.toString() === req.body.assignedTo
      );
      if (!isMember) {
        return res.status(400).json({ success: false, message: 'Assigned user is not a project member' });
      }
    }

    const task = await Task.create({
      ...req.body,
      createdBy: req.user._id
    });

    await task.populate('assignedTo', 'name email');
    await task.populate('createdBy', 'name email');

    res.status(201).json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/tasks/:id
// @desc    Get single task
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name');

    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const project = await Project.findById(task.project._id);
    const role = getMemberRole(project, req.user._id);
    if (!role) return res.status(403).json({ success: false, message: 'Access denied' });

    // Members can only see their own tasks
    if (role === 'Member' && task.assignedTo?._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, task, userRole: role });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update a task
// @access  Private (Admin: all fields; Member: status only)
router.put('/:id', protect, [
  body('title').optional().trim().isLength({ min: 2 }).withMessage('Title must be at least 2 characters'),
  body('status').optional().isIn(['To Do', 'In Progress', 'Done']).withMessage('Invalid status'),
  body('priority').optional().isIn(['Low', 'Medium', 'High']).withMessage('Invalid priority'),
  body('dueDate').optional().isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const project = await Project.findById(task.project);
    const role = getMemberRole(project, req.user._id);
    if (!role) return res.status(403).json({ success: false, message: 'Access denied' });

    if (role === 'Member') {
      // Members can only update status of their own tasks
      if (task.assignedTo?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'You can only update your own tasks' });
      }
      const { status } = req.body;
      if (!status) return res.status(400).json({ success: false, message: 'Members can only update task status' });

      task.status = status;
    } else {
      // Admin can update all fields
      const { title, description, status, priority, dueDate, assignedTo } = req.body;

      if (assignedTo) {
        const isMember = project.members.some(m => m.user.toString() === assignedTo);
        if (!isMember) {
          return res.status(400).json({ success: false, message: 'Assigned user is not a project member' });
        }
      }

      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (status !== undefined) task.status = status;
      if (priority !== undefined) task.priority = priority;
      if (dueDate !== undefined) task.dueDate = dueDate;
      if (assignedTo !== undefined) task.assignedTo = assignedTo || null;
    }

    await task.save();
    await task.populate('assignedTo', 'name email');
    await task.populate('createdBy', 'name email');

    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
// @access  Private (Admin only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const project = await Project.findById(task.project);
    const role = getMemberRole(project, req.user._id);
    if (!role) return res.status(403).json({ success: false, message: 'Access denied' });
    if (role !== 'Admin') return res.status(403).json({ success: false, message: 'Only Admins can delete tasks' });

    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
