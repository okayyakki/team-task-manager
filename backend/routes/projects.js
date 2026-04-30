const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');
const { protect } = require('../middleware/auth');
const { isMember, isAdmin } = require('../middleware/projectRole');

// @route   GET /api/projects
// @desc    Get all projects for current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const projects = await Project.find({ 'members.user': req.user._id })
      .populate('createdBy', 'name email')
      .populate('members.user', 'name email')
      .sort({ createdAt: -1 });

    // Add user's role to each project
    const projectsWithRole = projects.map(p => {
      const member = p.members.find(m => m.user._id.toString() === req.user._id.toString());
      return {
        ...p.toObject(),
        myRole: member ? member.role : 'Member'
      };
    });

    res.json({ success: true, projects: projectsWithRole });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private
router.post('/', protect, [
  body('name').trim().isLength({ min: 2 }).withMessage('Project name must be at least 2 characters'),
  body('description').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, description } = req.body;
    const project = await Project.create({
      name,
      description,
      createdBy: req.user._id,
      members: [{ user: req.user._id, role: 'Admin' }]
    });

    await project.populate('createdBy', 'name email');
    await project.populate('members.user', 'name email');

    res.status(201).json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/projects/:id
// @desc    Get single project
// @access  Private (members only)
router.get('/:id', protect, isMember, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('members.user', 'name email');

    res.json({
      success: true,
      project: { ...project.toObject(), myRole: req.userRole }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update project details
// @access  Private (Admin only)
router.put('/:id', protect, isAdmin, [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('description').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, description } = req.body;
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email').populate('members.user', 'name email');

    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete a project
// @access  Private (Admin only)
router.delete('/:id', protect, isAdmin, async (req, res) => {
  try {
    await Task.deleteMany({ project: req.params.id });
    await Project.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/projects/:id/members
// @desc    Add a member to project
// @access  Private (Admin only)
router.post('/:id/members', protect, isAdmin, [
  body('email').isEmail().normalizeEmail().withMessage('Enter a valid email'),
  body('role').optional().isIn(['Admin', 'Member']).withMessage('Role must be Admin or Member')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { email, role = 'Member' } = req.body;

    const userToAdd = await User.findOne({ email });
    if (!userToAdd) {
      return res.status(404).json({ success: false, message: 'User not found with that email' });
    }

    const project = req.project;
    const alreadyMember = project.members.some(
      m => m.user.toString() === userToAdd._id.toString()
    );

    if (alreadyMember) {
      return res.status(400).json({ success: false, message: 'User is already a member' });
    }

    project.members.push({ user: userToAdd._id, role });
    await project.save();
    await project.populate('members.user', 'name email');

    res.json({ success: true, message: 'Member added successfully', project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   DELETE /api/projects/:id/members/:userId
// @desc    Remove a member from project
// @access  Private (Admin only)
router.delete('/:id/members/:userId', protect, isAdmin, async (req, res) => {
  try {
    const project = req.project;

    // Cannot remove the creator
    if (project.createdBy.toString() === req.params.userId) {
      return res.status(400).json({ success: false, message: 'Cannot remove the project creator' });
    }

    project.members = project.members.filter(
      m => m.user.toString() !== req.params.userId
    );
    await project.save();

    res.json({ success: true, message: 'Member removed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/projects/:id/members/:userId/role
// @desc    Update member role
// @access  Private (Admin only)
router.put('/:id/members/:userId/role', protect, isAdmin, [
  body('role').isIn(['Admin', 'Member']).withMessage('Role must be Admin or Member')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const project = req.project;
    const member = project.members.find(
      m => m.user.toString() === req.params.userId
    );

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    member.role = req.body.role;
    await project.save();

    res.json({ success: true, message: 'Role updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
