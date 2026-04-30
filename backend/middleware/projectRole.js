const Project = require('../models/Project');

// Check if user is a member of the project
const isMember = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.body.project || req.params.id;
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const member = project.members.find(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!member) {
      return res.status(403).json({ success: false, message: 'Access denied: not a project member' });
    }

    req.project = project;
    req.userRole = member.role;
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Check if user is Admin of the project
const isAdmin = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.body.project || req.params.id;
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const member = project.members.find(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!member || member.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Access denied: Admin only' });
    }

    req.project = project;
    req.userRole = 'Admin';
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { isMember, isAdmin };
